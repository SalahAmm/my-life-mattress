import type { Database } from 'better-sqlite3'
import type {
  NewSalePayload,
  Payment,
  PaymentType,
  SaleItemDetailed,
  SaleWithDetails,
} from '@shared/types'
import { AppError, type SaleStatus } from '@shared/types'
import { saleTotal } from '@shared/money'

function getCustomerId(db: Database, name: string, phone: string | null): number {
  if (phone) {
    const existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone) as
      | { id: number }
      | undefined
    if (existing) return existing.id
  }
  const result = db.prepare('INSERT INTO customers (name, phone) VALUES (?, ?)').run(name, phone)
  return Number(result.lastInsertRowid)
}

function lookupVariant(db: Database, variantId: number) {
  return db.prepare('SELECT * FROM product_variants WHERE id = ?').get(variantId) as
    | { id: number; product_id: number; dimension: string; price: number }
    | undefined
}

function deductStockForSale(
  db: Database,
  saleId: number,
  createdBy: number,
  items: { productVariantId: number; quantity: number }[],
): void {
  const updateStock = db.prepare(
    'UPDATE stock_items SET quantity_on_hand = quantity_on_hand - ?, updated_at = ? WHERE product_variant_id = ?',
  )
  const insertMovement = db.prepare(
    `INSERT INTO stock_movements (stock_item_id, change, reason, reference_id, created_by)
     SELECT id, ?, 'sale', ?, ? FROM stock_items WHERE product_variant_id = ?`,
  )
  for (const item of items) {
    updateStock.run(item.quantity, new Date().toISOString(), item.productVariantId)
    insertMovement.run(-item.quantity, saleId, createdBy, item.productVariantId)
  }
}

export interface CreateSaleArgs {
  payload: NewSalePayload
  createdBy: number
}

export function createSale(db: Database, input: CreateSaleArgs): number {
  const { payload, createdBy } = input
  if (payload.items.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Cart is empty')
  }
  const run = db.transaction(() => {
    const customerId = getCustomerId(db, payload.customerName, payload.customerPhone)
    const saleResult = db
      .prepare(
        `INSERT INTO sales (customer_id, created_by, wilaya, delivery_address, free_delivery)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(customerId, createdBy, payload.wilaya, payload.deliveryAddress, payload.freeDelivery ? 1 : 0)
    const saleId = Number(saleResult.lastInsertRowid)

    const insertItem = db.prepare(
      `INSERT INTO sale_items (sale_id, product_variant_id, quantity, unit_price_at_sale, custom_description)
       VALUES (?, ?, ?, ?, ?)`,
    )
    const stockItems: { productVariantId: number; quantity: number }[] = []
    for (const item of payload.items) {
      let unitPrice = item.unitPriceAtSale
      if (item.productVariantId !== null) {
        const variant = lookupVariant(db, item.productVariantId)
        if (!variant) {
          throw new AppError('NOT_FOUND', 'Variant not found')
        }
        unitPrice = variant.price
        stockItems.push({ productVariantId: item.productVariantId, quantity: item.quantity })
      } else if (!item.customDescription) {
        throw new AppError('VALIDATION_ERROR', 'Custom item requires a description')
      }
      insertItem.run(saleId, item.productVariantId, item.quantity, unitPrice, item.customDescription)
    }

    if (payload.payment) {
      db.prepare(
        `INSERT INTO payments (sale_id, amount, type, entered_as_percentage)
         VALUES (?, ?, ?, ?)`,
      ).run(saleId, payload.payment.amount, payload.payment.type, payload.payment.enteredAsPercentage)
    }

    deductStockForSale(db, saleId, createdBy, stockItems)
    return saleId
  })
  return run()
}

export function getSale(db: Database, saleId: number): SaleWithDetails {
  const row = db
    .prepare(
      `SELECT s.*, c.name AS customer_name, c.phone AS customer_phone, u.username AS created_by_username
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       LEFT JOIN users u ON u.id = s.created_by
       WHERE s.id = ?`,
    )
    .get(saleId) as
    | {
        id: number
        customer_id: number | null
        customer_name: string | null
        customer_phone: string | null
        created_by: number
        created_by_username: string
        status: SaleStatus
        wilaya: string | null
        delivery_address: string | null
        free_delivery: number
        created_at: string
      }
    | undefined
  if (!row) {
    throw new AppError('NOT_FOUND', 'Sale not found')
  }
  const items = db
    .prepare(
      `SELECT si.*, p.name AS product_name, v.dimension, v.name AS variant_name
       FROM sale_items si
       LEFT JOIN product_variants v ON v.id = si.product_variant_id
       LEFT JOIN products p ON p.id = v.product_id
       WHERE si.sale_id = ?
       ORDER BY si.id`,
    )
    .all(saleId) as SaleItemDetailed[]
  const payments = db
    .prepare('SELECT * FROM payments WHERE sale_id = ? ORDER BY id')
    .all(saleId) as Payment[]
  const total = saleTotal(items.map((i) => ({ quantity: i.quantity, unitPrice: i.unit_price_at_sale })))
  const paid = payments.reduce((sum, p) => sum + p.amount, 0)
  return {
    ...row,
    free_delivery: Boolean(row.free_delivery),
    items,
    payments,
    total,
    paid,
    remaining: Math.max(0, total - paid),
  }
}

export function addPayment(
  db: Database,
  input: {
    saleId: number
    amount: number
    type: PaymentType
    enteredAsPercentage: number | null
  },
): void {
  const run = db.transaction(() => {
    const sale = getSale(db, input.saleId)
    if (sale.status === 'cancelled') {
      throw new AppError('VALIDATION_ERROR', 'Cannot pay a cancelled sale')
    }
    if (input.amount > sale.remaining) {
      throw new AppError('VALIDATION_ERROR', 'Payment exceeds remaining balance')
    }
    db.prepare(
      'INSERT INTO payments (sale_id, amount, type, entered_as_percentage) VALUES (?, ?, ?, ?)',
    ).run(input.saleId, input.amount, input.type, input.enteredAsPercentage)
  })
  run()
}

export function setSaleStatus(db: Database, saleId: number, status: SaleStatus): void {
  const result = db.prepare('UPDATE sales SET status = ? WHERE id = ?').run(status, saleId)
  if (result.changes === 0) {
    throw new AppError('NOT_FOUND', 'Sale not found')
  }
}

export function cancelSale(db: Database, input: { saleId: number; createdBy: number }): void {
  const run = db.transaction(() => {
    const sale = getSale(db, input.saleId)
    if (sale.status === 'cancelled') return
    const catalogItems = sale.items.filter((i) => i.product_variant_id !== null)
    const updateStock = db.prepare(
      'UPDATE stock_items SET quantity_on_hand = quantity_on_hand + ?, updated_at = ? WHERE product_variant_id = ?',
    )
    const insertMovement = db.prepare(
      `INSERT INTO stock_movements (stock_item_id, change, reason, reference_id, created_by)
       SELECT id, ?, 'adjustment', ?, ? FROM stock_items WHERE product_variant_id = ?`,
    )
    for (const item of catalogItems) {
      updateStock.run(item.quantity, new Date().toISOString(), item.product_variant_id)
      insertMovement.run(item.quantity, input.saleId, input.createdBy, item.product_variant_id)
    }
    db.prepare("UPDATE sales SET status = 'cancelled' WHERE id = ?").run(input.saleId)
  })
  run()
}

export function listRecentSales(db: Database, limit: number): SaleWithDetails[] {
  const rows = db.prepare('SELECT id FROM sales ORDER BY id DESC LIMIT ?').all(limit) as {
    id: number
  }[]
  return rows.map((r) => getSale(db, r.id))
}

export function listSales(db: Database, input: { status?: SaleStatus }): SaleWithDetails[] {
  const rows = input.status
    ? (db.prepare('SELECT id FROM sales WHERE status = ? ORDER BY id DESC').all(input.status) as { id: number }[])
    : (db.prepare('SELECT id FROM sales ORDER BY id DESC').all() as { id: number }[])
  return rows.map((r) => getSale(db, r.id))
}

export function deleteSale(db: Database, saleId: number): void {
  const run = db.transaction(() => {
    const sale = getSale(db, saleId)
    if (sale.status !== 'delivered') {
      throw new AppError('VALIDATION_ERROR', 'Only delivered sales can be deleted from history')
    }
    db.prepare('DELETE FROM payments WHERE sale_id = ?').run(saleId)
    db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(saleId)
    db.prepare('DELETE FROM sales WHERE id = ?').run(saleId)
  })
  run()
}

export function clearDelivered(db: Database): number {
  const run = db.transaction(() => {
    const rows = db.prepare("SELECT id FROM sales WHERE status = 'delivered'").all() as { id: number }[]
    for (const row of rows) {
      db.prepare('DELETE FROM payments WHERE sale_id = ?').run(row.id)
      db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(row.id)
      db.prepare('DELETE FROM sales WHERE id = ?').run(row.id)
    }
    return rows.length
  })
  return run()
}
