import { describe, expect, it } from 'vitest'
import { saleItemsLabel, variantLabel } from './variants'

describe('variantLabel (ticket 01)', () => {
  it('prefers the name when present', () => {
    expect(variantLabel('Sahara', null)).toBe('Sahara')
    expect(variantLabel('Sahara', '')).toBe('Sahara')
  })

  it('falls back to the dimension', () => {
    expect(variantLabel(null, '160x190')).toBe('160x190')
    expect(variantLabel('', '160x190')).toBe('160x190')
  })

  it('combines name and dimension when both exist', () => {
    expect(variantLabel('Blanc', '160x190')).toBe('Blanc — 160x190')
  })

  it('never returns a blank label', () => {
    expect(variantLabel(null, null)).toBe('')
    expect(variantLabel('', '')).toBe('')
  })
})

describe('saleItemsLabel', () => {
  const item = (overrides: Record<string, unknown>) => ({
    product_variant_id: 1,
    product_name: 'Matelas Elite',
    dimension: '160x190',
    variant_name: null,
    quantity: 1,
    custom_description: null,
    ...overrides,
  })

  it('joins product names with dimension and quantity', () => {
    expect(
      saleItemsLabel([
        item({ quantity: 2 }),
        item({ product_variant_id: 2, product_name: 'Oreiller', dimension: '40x60' }),
      ]),
    ).toBe('Matelas Elite 160x190 ×2 · Oreiller 40x60')
  })

  it('omits the quantity suffix for single units', () => {
    expect(saleItemsLabel([item({})])).toBe('Matelas Elite 160x190')
  })

  it('uses the custom description for custom items', () => {
    expect(
      saleItemsLabel([
        item({ product_variant_id: null, product_name: null, dimension: null, custom_description: 'Dimension Personnalisée: 170x200' }),
      ]),
    ).toBe('Dimension Personnalisée: 170x200')
  })

  it('combines variant name and dimension', () => {
    expect(saleItemsLabel([item({ product_name: 'Lit Sierra', dimension: '', variant_name: 'Sahara' })])).toBe('Lit Sierra Sahara')
  })

  it('returns an empty string for an empty cart', () => {
    expect(saleItemsLabel([])).toBe('')
  })
})
