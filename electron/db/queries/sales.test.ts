// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../connection'
import { createProduct, listProducts } from './products'
import { createUser } from './users'
import {
  addPayment,
  cancelSale,
  clearDelivered,
  createSale,
  deleteSale,
  getSale,
  listSales,
  setSaleStatus,
  type CreateSaleArgs,
} from './sales'
import { listMovementsForVariant } from './stock'

function database() {
  return createDatabase(':memory:')
}

function seed(db: ReturnType<typeof createDatabase>) {
  const owner = createUser(db, { username: 'owner', passwordHash: 'x', role: 'owner' })
  createProduct(db, {
    name: 'Matelas Elite',
    categoryId: null,
    supplierId: null,
    variants: [
      { dimension: '160x190', price: 45000, sku: null, initialStock: 4, lowStockThreshold: 2 },
      { dimension: '180x200', price: 55000, sku: null, initialStock: 3, lowStockThreshold: 1 },
    ],
  })
  const [product] = listProducts(db)
  return { db, owner, product }
}

function saleArgs(
  owner: number,
  overrides: Partial<CreateSaleArgs['payload']> = {},
): CreateSaleArgs {
  return {
    createdBy: owner,
    payload: {
      customerName: 'Ahmed Benali',
      customerPhone: '0550123456',
      wilaya: 'Alger',
      deliveryAddress: 'Rue des Frères, Alger',
      items: [],
      payment: null,
      ...overrides,
    },
  }
}

describe('sales queries', () => {
  it('creates a sale with items, snapshots prices and deducts stock atomically', () => {
    const { db, owner, product } = seed(database())
    const variant = product.variants[0]
    const saleId = createSale(
      db,
      saleArgs(owner, {
        items: [{ productVariantId: variant.id, quantity: 2, unitPriceAtSale: 0, customDescription: null }],
      }),
    )
    const sale = getSale(db, saleId)
    expect(sale.items).toHaveLength(1)
    expect(sale.items[0].unit_price_at_sale).toBe(45000)
    expect(sale.total).toBe(90000)
    const after = listProducts(db)[0].variants[0]
    expect(after.quantity_on_hand).toBe(2)
    const movements = listMovementsForVariant(db, variant.id)
    expect(movements).toHaveLength(1)
    expect(movements[0].change).toBe(-2)
    expect(movements[0].reason).toBe('sale')
  })

  it('allows stock to go negative and records the movement', () => {
    const { db, owner, product } = seed(database())
    const variant = product.variants[0]
    createSale(
      db,
      saleArgs(owner, {
        items: [{ productVariantId: variant.id, quantity: 10, unitPriceAtSale: 0, customDescription: null }],
      }),
    )
    expect(listProducts(db)[0].variants[0].quantity_on_hand).toBe(-6)
  })

  it('saves custom items with their description and price, without touching stock', () => {
    const { db, owner, product } = seed(database())
    const variant = product.variants[0]
    createSale(
      db,
      saleArgs(owner, {
        items: [
          { productVariantId: null, quantity: 1, unitPriceAtSale: 70000, customDescription: 'Dimension Personnalisée: 170x200' },
          { productVariantId: variant.id, quantity: 1, unitPriceAtSale: 0, customDescription: null },
        ],
      }),
    )
    const after = listProducts(db)[0].variants[0]
    expect(after.quantity_on_hand).toBe(3)
    const sale = getSale(db, 1)
    expect(sale.total).toBe(70000 + 45000)
    expect(sale.items[0].custom_description).toBe('Dimension Personnalisée: 170x200')
  })

  it('rejects empty carts', () => {
    const { db, owner } = seed(database())
    expect(() => createSale(db, saleArgs(owner))).toThrow()
  })

  it('records a full payment and computes remaining balance', () => {
    const { db, owner, product } = seed(database())
    const variant = product.variants[0]
    const saleId = createSale(
      db,
      saleArgs(owner, {
        payment: { amount: 45000, type: 'full', enteredAsPercentage: null },
        items: [{ productVariantId: variant.id, quantity: 1, unitPriceAtSale: 0, customDescription: null }],
      }),
    )
    const sale = getSale(db, saleId)
    expect(sale.paid).toBe(45000)
    expect(sale.remaining).toBe(0)
  })

  it('records a percentage deposit as a flat amount with display metadata', () => {
    const { db, owner, product } = seed(database())
    const variant = product.variants[0]
    const saleId = createSale(
      db,
      saleArgs(owner, {
        payment: { amount: 13500, type: 'deposit', enteredAsPercentage: 30 },
        items: [{ productVariantId: variant.id, quantity: 1, unitPriceAtSale: 0, customDescription: null }],
      }),
    )
    const sale = getSale(db, saleId)
    expect(sale.remaining).toBe(31500)
    expect(sale.payments[0].entered_as_percentage).toBe(30)
  })

  it('adds a balance payment later', () => {
    const { db, owner, product } = seed(database())
    const variant = product.variants[0]
    const saleId = createSale(
      db,
      saleArgs(owner, {
        payment: { amount: 13500, type: 'deposit', enteredAsPercentage: 30 },
        items: [{ productVariantId: variant.id, quantity: 1, unitPriceAtSale: 0, customDescription: null }],
      }),
    )
    addPayment(db, { saleId, amount: 31500, type: 'balance', enteredAsPercentage: null })
    const sale = getSale(db, saleId)
    expect(sale.paid).toBe(45000)
    expect(sale.remaining).toBe(0)
  })

  it('refuses a payment that exceeds the remaining balance', () => {
    const { db, owner, product } = seed(database())
    const variant = product.variants[0]
    const saleId = createSale(
      db,
      saleArgs(owner, {
        items: [{ productVariantId: variant.id, quantity: 1, unitPriceAtSale: 0, customDescription: null }],
      }),
    )
    expect(() =>
      addPayment(db, { saleId, amount: 99999, type: 'balance', enteredAsPercentage: null }),
    ).toThrow()
  })

  it('marking delivered updates the status', () => {
    const { db, owner, product } = seed(database())
    const variant = product.variants[0]
    const saleId = createSale(
      db,
      saleArgs(owner, {
        items: [{ productVariantId: variant.id, quantity: 1, unitPriceAtSale: 0, customDescription: null }],
      }),
    )
    setSaleStatus(db, saleId, 'delivered')
    expect(getSale(db, saleId).status).toBe('delivered')
  })

  it('cancelling a sale restores stock and records an adjustment movement', () => {
    const { db, owner, product } = seed(database())
    const variant = product.variants[0]
    const saleId = createSale(
      db,
      saleArgs(owner, {
        items: [{ productVariantId: variant.id, quantity: 2, unitPriceAtSale: 0, customDescription: null }],
      }),
    )
    cancelSale(db, { saleId, createdBy: owner })
    expect(getSale(db, saleId).status).toBe('cancelled')
    expect(listProducts(db)[0].variants[0].quantity_on_hand).toBe(4)
    const movements = listMovementsForVariant(db, variant.id)
    expect(movements.map((m) => m.change)).toEqual([2, -2])
  })

  it('persists the free-delivery flag and returns it on the sale', () => {
    const { db, owner, product } = seed(database())
    const variant = product.variants[0]
    const saleId = createSale(
      db,
      saleArgs(owner, {
        freeDelivery: true,
        items: [{ productVariantId: variant.id, quantity: 1, unitPriceAtSale: 0, customDescription: null }],
      }),
    )
    expect(getSale(db, saleId).free_delivery).toBe(true)
    const otherId = createSale(
      db,
      saleArgs(owner, {
        items: [{ productVariantId: variant.id, quantity: 1, unitPriceAtSale: 0, customDescription: null }],
      }),
    )
    expect(getSale(db, otherId).free_delivery).toBe(false)
  })
  it('reuses an existing customer by phone number', () => {
    const { db, owner, product } = seed(database())
    const variant = product.variants[0]
    const item = [{ productVariantId: variant.id, quantity: 1, unitPriceAtSale: 0, customDescription: null }]
    createSale(db, saleArgs(owner, { customerPhone: '0550123456', items: item }))
    const secondId = createSale(db, saleArgs(owner, { customerPhone: '0550123456', items: item }))
    const count = db.prepare('SELECT COUNT(*) AS n FROM customers').get() as { n: number }
    expect(count.n).toBe(1)
    expect(getSale(db, secondId).customer_name).toBe('Ahmed Benali')
  })

  it('lists sales filtered by status with full details', () => {
    const { db, owner, product } = seed(database())
    const variant = product.variants[0]
    const item = [{ productVariantId: variant.id, quantity: 1, unitPriceAtSale: 0, customDescription: null }]
    const first = createSale(db, saleArgs(owner, { items: item, wilaya: 'Alger' }))
    createSale(db, saleArgs(owner, { items: item, wilaya: 'Oran' }))
    const delivered = createSale(db, saleArgs(owner, { items: item, wilaya: 'Blida' }))
    setSaleStatus(db, delivered, 'delivered')
    const ordered = listSales(db, { status: 'ordered' })
    expect(ordered).toHaveLength(2)
    expect(ordered[0].wilaya).toBe('Oran')
    const all = listSales(db, {})
    expect(all).toHaveLength(3)
    expect(all.find((s) => s.id === first)?.items).toHaveLength(1)
    expect(all.find((s) => s.id === first)?.remaining).toBe(45000)
  })

  describe('deleteSale / clearDelivered (delivery history)', () => {
    it('refuses to delete an ordered sale', () => {
      const { db, owner, product } = seed(database())
      const variant = product.variants[0]
      const item = [{ productVariantId: variant.id, quantity: 1, unitPriceAtSale: 0, customDescription: null }]
      const saleId = createSale(db, saleArgs(owner, { items: item }))
      expect(() => deleteSale(db, saleId)).toThrow()
    })

    it('deletes a delivered sale with its items and payments, without touching stock', () => {
      const { db, owner, product } = seed(database())
      const variant = product.variants[0]
      const item = [{ productVariantId: variant.id, quantity: 1, unitPriceAtSale: 0, customDescription: null }]
      const saleId = createSale(db, saleArgs(owner, { items: item, payment: { amount: 10000, type: 'deposit', enteredAsPercentage: 30 } }))
      setSaleStatus(db, saleId, 'delivered')
      const stockBefore = db.prepare('SELECT quantity_on_hand FROM stock_items WHERE product_variant_id = ?').get(variant.id) as { quantity_on_hand: number }
      deleteSale(db, saleId)
      expect(() => getSale(db, saleId)).toThrow()
      const count = db.prepare('SELECT COUNT(*) AS n FROM sale_items WHERE sale_id = ?').get(saleId) as { n: number }
      expect(count.n).toBe(0)
      const payCount = db.prepare('SELECT COUNT(*) AS n FROM payments WHERE sale_id = ?').get(saleId) as { n: number }
      expect(payCount.n).toBe(0)
      const stockAfter = db.prepare('SELECT quantity_on_hand FROM stock_items WHERE product_variant_id = ?').get(variant.id) as { quantity_on_hand: number }
      expect(stockAfter.quantity_on_hand).toBe(stockBefore.quantity_on_hand)
    })

    it('clears only delivered sales', () => {
      const { db, owner, product } = seed(database())
      const variant = product.variants[0]
      const item = [{ productVariantId: variant.id, quantity: 1, unitPriceAtSale: 0, customDescription: null }]
      createSale(db, saleArgs(owner, { items: item }))
      const delivered = createSale(db, saleArgs(owner, { items: item }))
      setSaleStatus(db, delivered, 'delivered')
      const cleared = clearDelivered(db)
      expect(cleared).toBe(1)
      const remaining = db.prepare('SELECT status, COUNT(*) AS n FROM sales GROUP BY status').all() as { status: string; n: number }[]
      expect(remaining).toEqual([{ status: 'ordered', n: 1 }])
    })
  })
})
