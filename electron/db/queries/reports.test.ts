// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../connection'
import { createProduct, listProducts } from './products'
import { createUser } from './users'
import { createSale, setSaleStatus } from './sales'
import { reportSummary } from './reports'
import type Database from 'better-sqlite3'

function seed(db: Database.Database) {
  const owner = createUser(db, { username: 'owner', passwordHash: 'x', role: 'owner' })
  createProduct(db, {
    name: 'Matelas Elite',
    categoryId: null,
    supplierId: null,
    variants: [{ dimension: '160x190', price: 45000, sku: null, initialStock: 10, lowStockThreshold: 1 }],
  })
  createProduct(db, {
    name: 'Lit Sierra',
    categoryId: null,
    supplierId: null,
    variants: [{ dimension: '', name: 'Sahara', price: 60000, sku: null, initialStock: 10, lowStockThreshold: 1 }],
  })
  const [matelas, lit] = listProducts(db)
  const variantOf = (productId: number) => listProducts(db).find((p) => p.id === productId)!.variants[0].id
  const at = (iso: string, createdBy: number, items: { productVariantId: number; qty: number }[], payment?: { amount: number; type: 'deposit' | 'full' }) => {
    const saleId = createSale(db, {
      createdBy,
      payload: {
        customerName: 'C',
        customerPhone: null,
        wilaya: null,
        deliveryAddress: null,
        items: items.map((i) => ({ productVariantId: i.productVariantId, quantity: i.qty, unitPriceAtSale: 0, customDescription: null })),
        payment: payment ? { ...payment, enteredAsPercentage: null } : null,
      },
    })
    db.prepare('UPDATE sales SET created_at = ? WHERE id = ?').run(iso, saleId)
    return saleId
  }
  void matelas
  void lit
  return { db, owner, variantOf, at }
}

describe('reportSummary (ticket 01)', () => {
  it('computes revenue, deposits, outstanding, count and breakdown for a range', () => {
    const { db, owner, variantOf, at } = seed(createDatabase(':memory:'))
    at('2026-08-03T10:00:00.000Z', owner, [{ productVariantId: variantOf(1), qty: 1 }], { amount: 45000, type: 'full' })
    at('2026-08-04T10:00:00.000Z', owner, [{ productVariantId: variantOf(2), qty: 1 }], { amount: 13500, type: 'deposit' })
    at('2026-08-10T10:00:00.000Z', owner, [{ productVariantId: variantOf(1), qty: 1 }], { amount: 45000, type: 'full' })
    const summary = reportSummary(db, { from: '2026-08-01T00:00:00.000Z', to: '2026-08-08T00:00:00.000Z' })
    expect(summary.revenue).toBe(105000)
    expect(summary.depositsCollected).toBe(13500)
    expect(summary.outstanding).toBe(46500)
    expect(summary.salesCount).toBe(2)
    expect(summary.perProduct).toHaveLength(2)
    expect(summary.perProduct[0].label).toBe('Lit Sierra Sahara')
    expect(summary.perProduct[0].revenue).toBe(60000)
    expect(summary.perProduct[1].label).toBe('Matelas Elite 160x190')
    expect(summary.perProduct[1].units).toBe(1)
  })

  it('excludes cancelled sales from every total', () => {
    const { db, owner, variantOf, at } = seed(createDatabase(':memory:'))
    at('2026-08-03T10:00:00.000Z', owner, [{ productVariantId: variantOf(1), qty: 1 }], { amount: 45000, type: 'full' })
    const cancelledId = at('2026-08-04T10:00:00.000Z', owner, [{ productVariantId: variantOf(2), qty: 1 }], { amount: 60000, type: 'full' })
    setSaleStatus(db, cancelledId, 'cancelled')
    const summary = reportSummary(db, { from: '2026-08-01T00:00:00.000Z', to: '2026-08-08T00:00:00.000Z' })
    expect(summary.revenue).toBe(45000)
    expect(summary.salesCount).toBe(1)
    expect(summary.perProduct).toHaveLength(1)
  })

  it('counts custom items in the breakdown under their description', () => {
    const db = createDatabase(':memory:')
    const owner = createUser(db, { username: 'owner', passwordHash: 'x', role: 'owner' })
    const saleId = createSale(db, {
      createdBy: owner,
      payload: {
        customerName: 'C',
        customerPhone: null,
        wilaya: null,
        deliveryAddress: null,
        items: [{ productVariantId: null, quantity: 1, unitPriceAtSale: 70000, customDescription: 'Dimension Personnalisée: 170x200' }],
        payment: { amount: 70000, type: 'full', enteredAsPercentage: null },
      },
    })
    db.prepare('UPDATE sales SET created_at = ? WHERE id = ?').run('2026-08-03T10:00:00.000Z', saleId)
    const summary = reportSummary(db, { from: '2026-08-01T00:00:00.000Z', to: '2026-08-08T00:00:00.000Z' })
    expect(summary.revenue).toBe(70000)
    expect(summary.perProduct[0].label).toBe('Dimension Personnalisée: 170x200')
    expect(summary.perProduct[0].revenue).toBe(70000)
  })

  it('returns zeroed results when the range is reversed (from > to)', () => {
    const { db, owner, variantOf, at } = seed(createDatabase(':memory:'))
    at('2026-08-03T10:00:00.000Z', owner, [{ productVariantId: variantOf(1), qty: 1 }])
    const summary = reportSummary(db, { from: '2026-08-10T00:00:00.000Z', to: '2026-08-01T00:00:00.000Z' })
    expect(summary.revenue).toBe(0)
    expect(summary.salesCount).toBe(0)
    expect(summary.outstanding).toBe(0)
    expect(summary.depositsCollected).toBe(0)
  })

  it('includes sales on the same day within the range', () => {
    const { db, owner, variantOf, at } = seed(createDatabase(':memory:'))
    at('2026-08-04T10:00:00.000Z', owner, [{ productVariantId: variantOf(1), qty: 1 }])
    const summary = reportSummary(db, { from: '2026-08-04T00:00:00.000Z', to: '2026-08-05T00:00:00.000Z' })
    expect(summary.salesCount).toBe(1)
    expect(summary.revenue).toBe(45000)
  })
})
