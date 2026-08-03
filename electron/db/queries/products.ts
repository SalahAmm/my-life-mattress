import type { Database } from 'better-sqlite3'
import type { CounterProduct, NewProductInput, ProductWithVariants } from '@shared/types'

export function createProduct(db: Database, input: NewProductInput): number {
  const create = db.transaction(() => {
    const result = db
      .prepare('INSERT INTO products (name, category_id, supplier_id, image_path) VALUES (?, ?, ?, ?)')
      .run(input.name, input.categoryId, input.supplierId, input.imagePath ?? null)
    const productId = Number(result.lastInsertRowid)
    const insertVariant = db.prepare(
      'INSERT INTO product_variants (product_id, dimension, name, price, sku) VALUES (?, ?, ?, ?, ?)',
    )
    const insertStock = db.prepare(
      'INSERT INTO stock_items (product_variant_id, quantity_on_hand, low_stock_threshold) VALUES (?, ?, ?)',
    )
    for (const variant of input.variants) {
      const variantResult = insertVariant.run(
        productId,
        variant.dimension,
        variant.name ?? null,
        variant.price,
        variant.sku,
      )
      const variantId = Number(variantResult.lastInsertRowid)
      insertStock.run(variantId, variant.initialStock, variant.lowStockThreshold)
    }
    return productId
  })
  return create()
}

const PRODUCT_QUERY = `
  SELECT
    p.id, p.name, p.category_id, p.supplier_id, p.image_path, p.active,
    c.name AS category_name,
    s.name AS supplier_name
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN suppliers s ON s.id = p.supplier_id
  WHERE p.active = 1
  ORDER BY p.name
`

function variantsFor(db: Database, productIds: number[]) {
  if (productIds.length === 0) return []
  const placeholders = productIds.map(() => '?').join(',')
  return db
    .prepare(
      `SELECT
        v.id, v.product_id, v.dimension, v.name, v.price, v.sku,
        si.quantity_on_hand, si.low_stock_threshold
       FROM product_variants v
       LEFT JOIN stock_items si ON si.product_variant_id = v.id
       WHERE v.product_id IN (${placeholders})
       ORDER BY v.id`,
    )
    .all(...productIds) as {
    id: number
    product_id: number
    dimension: string
    name: string | null
    price: number
    sku: string | null
    quantity_on_hand: number
    low_stock_threshold: number
  }[]
}

export function listProducts(db: Database): ProductWithVariants[] {
  const rows = db.prepare(PRODUCT_QUERY).all() as {
    id: number
    name: string
    category_id: number | null
    supplier_id: number | null
    image_path: string | null
    active: number
    category_name: string | null
    supplier_name: string | null
  }[]
  const variants = variantsFor(
    db,
    rows.map((r) => r.id),
  )
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category_id: row.category_id,
    category_name: row.category_name,
    supplier_id: row.supplier_id,
    supplier_name: row.supplier_name,
    image_path: row.image_path,
    active: Boolean(row.active),
    variants: variants
      .filter((v) => v.product_id === row.id)
      .map((v) => ({
        id: v.id,
        product_id: v.product_id,
        dimension: v.dimension,
        name: v.name,
        price: v.price,
        sku: v.sku,
        quantity_on_hand: v.quantity_on_hand,
        low_stock_threshold: v.low_stock_threshold,
        out_of_stock: v.quantity_on_hand <= 0,
      })),
  }))
}

export function listCounterProducts(db: Database): CounterProduct[] {
  const rows = db.prepare(PRODUCT_QUERY).all() as {
    id: number
    name: string
    category_id: number | null
    image_path: string | null
  }[]
  const variants = variantsFor(
    db,
    rows.map((r) => r.id),
  )
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category_id: row.category_id,
    image_path: row.image_path,
    variants: variants
      .filter((v) => v.product_id === row.id)
      .map((v) => ({
        id: v.id,
        dimension: v.dimension,
        name: v.name,
        price: v.price,
        out_of_stock: v.quantity_on_hand <= 0,
      })),
  }))
}

export function deactivateProduct(db: Database, id: number): void {
  db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(id)
}
