// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { AppError } from '@shared/types'
import { requireOwner } from './handlers'
import { PRODUCT_SCHEMA, SALE_SCHEMA, SETTINGS_SCHEMA } from './handlers'

const employeeAuth = {
  getSession: () => ({ userId: 2, username: 'Sofiane', role: 'employee' }),
} as never

const ownerAuth = {
  getSession: () => ({ userId: 1, username: 'Kamel', role: 'owner' }),
} as never

describe('role guard', () => {
  it('rejects an employee session for owner-only actions', () => {
    expect(() => requireOwner(employeeAuth)).toThrow(AppError)
    try {
      requireOwner(employeeAuth)
    } catch (error) {
      expect((error as AppError).code).toBe('UNAUTHORIZED')
    }
  })

  it('allows an owner session', () => {
    expect(() => requireOwner(ownerAuth)).not.toThrow()
  })

  it('rejects a missing session', () => {
    const noAuth = { getSession: () => null } as never
    expect(() => requireOwner(noAuth)).toThrow()
  })
})

describe('sale payload validation', () => {
  const base = {
    customerName: 'Ahmed',
    customerPhone: '0550123456',
    wilaya: null,
    deliveryAddress: null,
    items: [{ productVariantId: 1, quantity: 1, unitPriceAtSale: 0, customDescription: null }],
    payment: null,
  }

  it('accepts a valid payload', () => {
    expect(SALE_SCHEMA.safeParse(base).success).toBe(true)
  })

  it('rejects an empty cart', () => {
    expect(SALE_SCHEMA.safeParse({ ...base, items: [] }).success).toBe(false)
  })

  it('rejects zero or negative quantities', () => {
    expect(SALE_SCHEMA.safeParse({ ...base, items: [{ ...base.items[0], quantity: 0 }] }).success).toBe(false)
    expect(SALE_SCHEMA.safeParse({ ...base, items: [{ ...base.items[0], quantity: -1 }] }).success).toBe(false)
  })

  it('rejects a custom item without a description', () => {
    expect(
      SALE_SCHEMA.safeParse({
        ...base,
        items: [{ productVariantId: null, quantity: 1, unitPriceAtSale: 5000, customDescription: null }],
      }).success,
    ).toBe(false)
  })

  it('rejects negative prices and amounts', () => {
    expect(
      SALE_SCHEMA.safeParse({ ...base, items: [{ ...base.items[0], unitPriceAtSale: -5 }] }).success,
    ).toBe(false)
    expect(
      SALE_SCHEMA.safeParse({
        ...base,
        payment: { amount: -10, type: 'deposit', enteredAsPercentage: null },
      }).success,
    ).toBe(false)
  })

  it('rejects an empty customer name', () => {
    expect(SALE_SCHEMA.safeParse({ ...base, customerName: '  ' }).success).toBe(false)
  })
})

describe('product payload validation', () => {
  const base = {
    name: 'Matelas Elite',
    categoryId: null,
    supplierId: null,
    variants: [{ dimension: '160x190', price: 45000, sku: null, initialStock: 0, lowStockThreshold: 2 }],
  }

  it('accepts a valid payload', () => {
    expect(PRODUCT_SCHEMA.safeParse(base).success).toBe(true)
  })

  it('rejects a product without variants', () => {
    expect(PRODUCT_SCHEMA.safeParse({ ...base, variants: [] }).success).toBe(false)
  })

  it('rejects an empty dimension', () => {
    expect(
      PRODUCT_SCHEMA.safeParse({ ...base, variants: [{ ...base.variants[0], dimension: ' ' }] }).success,
    ).toBe(false)
  })
})

describe('receipt settings validation', () => {
  it('rejects duplicate deposit percentages', () => {
    expect(
      SETTINGS_SCHEMA.safeParse({
        storeName: 'My Life Mattress',
        defaultDepositPercentages: [30, 30],
        showDeliveryNote: true,
      }).success,
    ).toBe(false)
  })

  it('accepts a valid payload and empty presets', () => {
    expect(
      SETTINGS_SCHEMA.safeParse({
        storeName: 'My Life Mattress',
        defaultDepositPercentages: [30, 50, 70],
        showDeliveryNote: false,
        showPhoneOnReceipt: true,
        showQuantityOnReceipt: true,
      }).success,
    ).toBe(true)
    expect(
      SETTINGS_SCHEMA.safeParse({
        storeName: 'My Life Mattress',
        defaultDepositPercentages: [],
        showDeliveryNote: true,
        showPhoneOnReceipt: true,
        showQuantityOnReceipt: true,
      }).success,
    ).toBe(true)
  })
})
