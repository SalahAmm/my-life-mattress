// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../connection'
import { listCategories, seedDefaultCategories } from './categories'
import { createProduct } from './products'
import { createSupplier } from './suppliers'
import { createUser } from './users'
import { wipeAllBusinessData } from './wipe'

describe('wipeAllBusinessData', () => {
  it('removes business data but keeps accounts, settings and default categories', () => {
    const db = createDatabase(':memory:')
    seedDefaultCategories(db)
    createUser(db, { username: 'Kamel', passwordHash: 'hash', role: 'owner' })
    createSupplier(db, { name: 'Rafik', phone: null })
    createProduct(db, {
      name: 'Matelas Elite',
      categoryId: 1,
      supplierId: 1,
      imagePath: null,
      variants: [{ dimension: '160x190', price: 45000, sku: null, initialStock: 5, lowStockThreshold: 2 }],
    })
    db.prepare(
      `INSERT INTO sales (customer_id, created_by, status, wilaya, delivery_address) VALUES (NULL, 1, 'ordered', 'Alger', NULL)`,
    ).run()
    db.prepare(
      `INSERT INTO sale_items (sale_id, product_variant_id, quantity, unit_price_at_sale) VALUES (1, 1, 1, 45000)`,
    ).run()
    db.prepare(`INSERT INTO payments (sale_id, amount, type) VALUES (1, 45000, 'full')`).run()

    wipeAllBusinessData(db)

    const count = (table: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n
    for (const table of ['sales', 'sale_items', 'payments', 'products', 'product_variants', 'stock_items', 'stock_movements', 'suppliers']) {
      expect(count(table), table).toBe(0)
    }
    expect(count('users')).toBe(1)
    expect(count('receipt_settings')).toBe(1)
    expect(listCategories(db).map((c) => c.name)).toEqual(['Matelas', 'Sommier', 'Accessoires'])
  })

  it('is idempotent on an already empty database', () => {
    const db = createDatabase(':memory:')
    wipeAllBusinessData(db)
    wipeAllBusinessData(db)
    expect(listCategories(db)).toHaveLength(3)
  })
})
