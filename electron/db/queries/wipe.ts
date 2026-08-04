import type { Database } from 'better-sqlite3'
import { seedDefaultCategories } from './categories'

export function wipeAllBusinessData(db: Database): void {
  const run = db.transaction(() => {
    db.exec(`
      DELETE FROM sale_items;
      DELETE FROM payments;
      DELETE FROM sales;
      DELETE FROM stock_movements;
      DELETE FROM stock_items;
      DELETE FROM product_variants;
      DELETE FROM products;
      DELETE FROM suppliers;
      DELETE FROM categories;
    `)
    seedDefaultCategories(db)
  })
  run()
}
