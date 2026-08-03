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
      dimensionPresets: ['90x190', '160x190'],
    })
    const settings = getReceiptSettings(db)
    expect(settings.default_deposit_percentages).toEqual([50])
    expect(settings.show_delivery_note).toBe(false)
    expect(settings.logo_path).toBe('C:/data/logo.png')
    expect(settings.store_name).toBe('My Life Mattress')
  })

  it('migration v4: dimension presets seeded with the three defaults', () => {
    const db = createDatabase(':memory:')
    const settings = getReceiptSettings(db)
    expect(settings.dimension_presets).toEqual(['90x190', '160x190', '180x200'])
  })

  it('round-trips a customized preset list', () => {
    const db = createDatabase(':memory:')
    updateReceiptSettings(db, {
      storeName: 'My Life Mattress',
      defaultDepositPercentages: [30, 50, 70],
      showDeliveryNote: true,
      showPhoneOnReceipt: true,
      showQuantityOnReceipt: true,
      logoPath: null,
      dimensionPresets: ['90x190', '160x190', '180x200', '200x200'],
    })
    expect(getReceiptSettings(db).dimension_presets).toEqual(['90x190', '160x190', '180x200', '200x200'])
  })
})
