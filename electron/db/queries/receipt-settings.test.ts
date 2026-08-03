// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../connection'
import { getReceiptSettings, updateReceiptSettings } from './receipt-settings'

describe('receipt settings', () => {
  it('returns defaults for a fresh database', () => {
    const db = createDatabase(':memory:')
    const settings = getReceiptSettings(db)
    expect(settings.store_name).toBe('My Life Mattress')
    expect(settings.default_deposit_percentages).toEqual([30, 50, 70])
    expect(settings.show_delivery_note).toBe(true)
    expect(settings.logo_path).toBeNull()
  })

  it('persists changes to the single row', () => {
    const db = createDatabase(':memory:')
    updateReceiptSettings(db, {
      storeName: 'My Life Mattress',
      defaultDepositPercentages: [50],
      showDeliveryNote: false,
      showPhoneOnReceipt: false,
      showQuantityOnReceipt: true,
      logoPath: 'C:/data/logo.png',
    })
    const settings = getReceiptSettings(db)
    expect(settings.default_deposit_percentages).toEqual([50])
    expect(settings.show_delivery_note).toBe(false)
    expect(settings.logo_path).toBe('C:/data/logo.png')
    expect(settings.store_name).toBe('My Life Mattress')
  })

  it('persists false for phone and quantity toggles', () => {
    const db = createDatabase(':memory:')
    updateReceiptSettings(db, {
      storeName: 'My Life Mattress',
      defaultDepositPercentages: [30, 50, 70],
      showDeliveryNote: true,
      showPhoneOnReceipt: false,
      showQuantityOnReceipt: false,
      logoPath: null,
    })
    const settings = getReceiptSettings(db)
    expect(settings.show_phone_on_receipt).toBe(false)
    expect(settings.show_quantity_on_receipt).toBe(false)
  })
})
