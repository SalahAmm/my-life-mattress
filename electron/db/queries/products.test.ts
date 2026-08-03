// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../connection'
import { createCategory } from './categories'
import { createSupplier } from './suppliers'
import {
  createProduct,
  deactivateProduct,
  listCounterProducts,
  listProducts,
  updateProduct,
} from './products'
import { createUser } from './users'
import { restock } from './stock'
import type { NewProductInput } from '@shared/types'

function database() {
  return createDatabase(':memory:')
}

function seed(db: ReturnType<typeof createDatabase>) {
  const cat = createCategory(db, { name: 'Matelas', sortOrder: 1 })
  const sup = createSupplier(db, { name: 'Rafik', phone: null })
  const input: NewProductInput = {
    name: 'Matelas Orthopédique Elite',
    categoryId: cat,
    supplierId: sup,
    variants: [
      { dimension: '160x190', price: 45000, sku: null, initialStock: 4, lowStockThreshold: 2 },
      { dimension: '180x200', price: 55000, sku: null, initialStock: 0, lowStockThreshold: 1 },
    ],
  }
  const productId = createProduct(db, input)
  return { db, productId, cat, sup }
}

describe('products queries', () => {
  it('creates a product with variants and stock items', () => {
    const { db } = seed(database())
    const products = listProducts(db)
    expect(products).toHaveLength(1)
    expect(products[0].name).toBe('Matelas Orthopédique Elite')
    expect(products[0].category_name).toBe('Matelas')
    expect(products[0].supplier_name).toBe('Rafik')
    expect(products[0].variants).toHaveLength(2)
    const [v1, v2] = products[0].variants
    expect(v1.quantity_on_hand).toBe(4)
    expect(v1.out_of_stock).toBe(false)
    expect(v2.quantity_on_hand).toBe(0)
    expect(v2.out_of_stock).toBe(true)
  })

  it('counter products never expose raw stock quantities', () => {
    const { db } = seed(database())
    const counter = listCounterProducts(db)
    expect(counter).toHaveLength(1)
    expect(counter[0].variants[0]).not.toHaveProperty('quantity_on_hand')
    expect(counter[0].variants[0].out_of_stock).toBe(false)
    expect(counter[0].variants[1].out_of_stock).toBe(true)
  })

  it('hides inactive products from counter and stock lists', () => {
    const { db, productId } = seed(database())
    deactivateProduct(db, productId)
    expect(listProducts(db)).toHaveLength(0)
    expect(listCounterProducts(db)).toHaveLength(0)
  })

  it('stock movements reconcile with quantity on hand', () => {
    const { db } = seed(database())
    const user = createUser(db, { username: 'u', passwordHash: 'x', role: 'owner' })
    const product = listProducts(db)[0]
    const variant = product.variants[0]
    const movement = restock(db, { stockItemId: variant.id, quantity: 3, createdBy: user })
    expect(movement.change).toBe(3)
    const after = listProducts(db)[0].variants[0]
    expect(after.quantity_on_hand).toBe(7)
  })

  it('migration v2: variants carry an optional name; beds use empty dimension', () => {
    const db = database()
    const cols = db.prepare('PRAGMA table_info(product_variants)').all() as { name: string }[]
    expect(cols.map((c) => c.name)).toContain('name')
    const productId = createProduct(db, {
      name: 'Lit Sierra',
      categoryId: null,
      supplierId: null,
      variants: [
        { dimension: '', name: 'Sahara', price: 80000, sku: null, initialStock: 2, lowStockThreshold: 1 },
        { dimension: '160x190', name: 'Blanc', price: 45000, sku: null, initialStock: 1, lowStockThreshold: 1 },
      ],
    })
    const product = listProducts(db).find((p) => p.id === productId)!
    expect(product.variants[0].name).toBe('Sahara')
    expect(product.variants[0].dimension).toBe('')
    expect(product.variants[1].name).toBe('Blanc')
    expect(product.variants[1].dimension).toBe('160x190')
  })

  it('counter products expose the variant name', () => {
    const db = database()
    createProduct(db, {
      name: 'Lit Sierra',
      categoryId: null,
      supplierId: null,
      variants: [{ dimension: '', name: 'Sahara', price: 80000, sku: null, initialStock: 0, lowStockThreshold: 0 }],
    })
    const counter = listCounterProducts(db)
    expect(counter[0].variants[0].name).toBe('Sahara')
    expect(counter[0].variants[0].dimension).toBe('')
  })

  it('updateProduct edits fields, updates variants in place and appends new ones', () => {
    const db = database()
    const cat = createCategory(db, { name: 'Lits', sortOrder: 1 })
    const sup = createSupplier(db, { name: 'Ahmed', phone: null })
    const productId = createProduct(db, {
      name: 'Lit Sierra',
      categoryId: null,
      supplierId: null,
      variants: [
        { dimension: '', name: 'Sahara', price: 80000, sku: null, initialStock: 2, lowStockThreshold: 1 },
        { dimension: '160x190', name: 'Blanc', price: 45000, sku: null, initialStock: 1, lowStockThreshold: 1 },
      ],
    })
    const before = listProducts(db).find((p) => p.id === productId)!
    updateProduct(db, {
      id: productId,
      name: 'Lit Sierra Pro',
      categoryId: cat,
      supplierId: sup,
      imagePath: 'C:/data/products/p2.png',
      variants: [
        { id: before.variants[0].id, dimension: '', name: 'Sahara', price: 82000, sku: null },
        { id: before.variants[1].id, dimension: '160x190', name: 'Blanc', price: 46000, sku: null },
        { dimension: '180x200', name: 'Noir', price: 90000, sku: null },
      ],
    })
    const after = listProducts(db).find((p) => p.id === productId)!
    expect(after.name).toBe('Lit Sierra Pro')
    expect(after.category_id).toBe(cat)
    expect(after.supplier_id).toBe(sup)
    expect(after.image_path).toBe('C:/data/products/p2.png')
    expect(after.variants).toHaveLength(3)
    expect(after.variants[0].price).toBe(82000)
    expect(after.variants[2].name).toBe('Noir')
  })

  it('migration v3: products carry an optional image path', () => {
    const db = database()
    const cols = db.prepare('PRAGMA table_info(products)').all() as { name: string }[]
    expect(cols.map((c) => c.name)).toContain('image_path')
    const productId = createProduct(db, {
      name: 'Matelas Photo',
      categoryId: null,
      supplierId: null,
      imagePath: 'C:/userData/products/p1.png',
      variants: [{ dimension: '160x190', price: 45000, sku: null, initialStock: 1, lowStockThreshold: 0 }],
    })
    const product = listProducts(db).find((p) => p.id === productId)!
    expect(product.image_path).toBe('C:/userData/products/p1.png')
    const counter = listCounterProducts(db).find((p) => p.id === productId)!
    expect(counter.image_path).toBe('C:/userData/products/p1.png')
  })
})
