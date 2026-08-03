import type { Database } from 'better-sqlite3'
import type { StockMovement } from '@shared/types'

export function restock(
  db: Database,
  input: { stockItemId: number; quantity: number; createdBy: number },
): StockMovement {
  const run = db.transaction(() => {
    db.prepare(
      'UPDATE stock_items SET quantity_on_hand = quantity_on_hand + ?, updated_at = ? WHERE id = ?',
    ).run(input.quantity, new Date().toISOString(), input.stockItemId)
    const result = db
      .prepare(
        `INSERT INTO stock_movements (stock_item_id, change, reason, created_by)
         VALUES (?, ?, 'restock', ?)`,
      )
      .run(input.stockItemId, input.quantity, input.createdBy)
    const id = Number(result.lastInsertRowid)
    return db.prepare('SELECT * FROM stock_movements WHERE id = ?').get(id) as StockMovement
  })
  return run()
}

export function adjustStock(
  db: Database,
  input: { stockItemId: number; change: number; createdBy: number },
): StockMovement {
  const run = db.transaction(() => {
    db.prepare(
      'UPDATE stock_items SET quantity_on_hand = MAX(0, quantity_on_hand + ?), updated_at = ? WHERE id = ?',
    ).run(input.change, new Date().toISOString(), input.stockItemId)
    const result = db
      .prepare(
        `INSERT INTO stock_movements (stock_item_id, change, reason, created_by)
         VALUES (?, ?, 'adjustment', ?)`,
      )
      .run(input.stockItemId, input.change, input.createdBy)
    const id = Number(result.lastInsertRowid)
    return db.prepare('SELECT * FROM stock_movements WHERE id = ?').get(id) as StockMovement
  })
  return run()
}

export function listMovementsForStockItem(db: Database, stockItemId: number): StockMovement[] {
  return db
    .prepare('SELECT * FROM stock_movements WHERE stock_item_id = ? ORDER BY id DESC')
    .all(stockItemId) as StockMovement[]
}
