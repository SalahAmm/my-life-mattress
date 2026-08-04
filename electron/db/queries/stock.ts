import type { Database } from 'better-sqlite3'
import type { StockMovement } from '@shared/types'

function stockItemIdForVariant(db: Database, productVariantId: number): number {
  const row = db.prepare('SELECT id FROM stock_items WHERE product_variant_id = ?').get(productVariantId) as
    | { id: number }
    | undefined
  if (!row) {
    throw new Error(`No stock item for variant ${productVariantId}`)
  }
  return row.id
}

export function restock(
  db: Database,
  input: { productVariantId: number; quantity: number; createdBy: number },
): StockMovement {
  const run = db.transaction(() => {
    const stockItemId = stockItemIdForVariant(db, input.productVariantId)
    db.prepare(
      'UPDATE stock_items SET quantity_on_hand = quantity_on_hand + ?, updated_at = ? WHERE id = ?',
    ).run(input.quantity, new Date().toISOString(), stockItemId)
    const result = db
      .prepare(
        `INSERT INTO stock_movements (stock_item_id, change, reason, created_by)
         VALUES (?, ?, 'restock', ?)`,
      )
      .run(stockItemId, input.quantity, input.createdBy)
    const id = Number(result.lastInsertRowid)
    return db.prepare('SELECT * FROM stock_movements WHERE id = ?').get(id) as StockMovement
  })
  return run()
}

export function adjustStock(
  db: Database,
  input: { productVariantId: number; change: number; createdBy: number },
): StockMovement {
  const run = db.transaction(() => {
    const stockItemId = stockItemIdForVariant(db, input.productVariantId)
    db.prepare(
      'UPDATE stock_items SET quantity_on_hand = MAX(0, quantity_on_hand + ?), updated_at = ? WHERE id = ?',
    ).run(input.change, new Date().toISOString(), stockItemId)
    const result = db
      .prepare(
        `INSERT INTO stock_movements (stock_item_id, change, reason, created_by)
         VALUES (?, ?, 'adjustment', ?)`,
      )
      .run(stockItemId, input.change, input.createdBy)
    const id = Number(result.lastInsertRowid)
    return db.prepare('SELECT * FROM stock_movements WHERE id = ?').get(id) as StockMovement
  })
  return run()
}

export function listMovementsForVariant(db: Database, productVariantId: number): StockMovement[] {
  return db
    .prepare(
      `SELECT m.* FROM stock_movements m
       JOIN stock_items si ON si.id = m.stock_item_id
       WHERE si.product_variant_id = ?
       ORDER BY m.id DESC`,
    )
    .all(productVariantId) as StockMovement[]
}

export function listMovementsForStockItem(db: Database, stockItemId: number): StockMovement[] {
  return db
    .prepare('SELECT * FROM stock_movements WHERE stock_item_id = ? ORDER BY id DESC')
    .all(stockItemId) as StockMovement[]
}
