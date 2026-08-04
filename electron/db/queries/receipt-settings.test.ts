// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { applyMigrations, createDatabase } from '../connection'
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

  it('migration v6: receipt format defaults to 80mm, auto height, normal text', () => {
    const db = createDatabase(':memory:')
    const settings = getReceiptSettings(db)
    expect(settings.receipt_width_mm).toBe(80)
    expect(settings.receipt_height_mm).toBeNull()
    expect(settings.receipt_font_scale).toBe(1)
  })

  it('round-trips customized receipt format settings', () => {
    const db = createDatabase(':memory:')
    updateReceiptSettings(db, {
      storeName: 'My Life Mattress',
      defaultDepositPercentages: [30],
      showDeliveryNote: true,
      showPhoneOnReceipt: true,
      showQuantityOnReceipt: true,
      logoPath: null,
      dimensionPresets: [],
      receiptWidthMm: 58,
      receiptHeightMm: 300,
      receiptFontScale: 1.2,
    })
    const settings = getReceiptSettings(db)
    expect(settings.receipt_width_mm).toBe(58)
    expect(settings.receipt_height_mm).toBe(300)
    expect(settings.receipt_font_scale).toBe(1.2)
  })

  it('stores a null height back as auto', () => {
    const db = createDatabase(':memory:')
    updateReceiptSettings(db, {
      storeName: 'My Life Mattress',
      defaultDepositPercentages: [30],
      showDeliveryNote: true,
      showPhoneOnReceipt: true,
      showQuantityOnReceipt: true,
      logoPath: null,
      dimensionPresets: [],
      receiptWidthMm: 100,
      receiptHeightMm: 250,
      receiptFontScale: 1,
    })
    updateReceiptSettings(db, {
      storeName: 'My Life Mattress',
      defaultDepositPercentages: [30],
      showDeliveryNote: true,
      showPhoneOnReceipt: true,
      showQuantityOnReceipt: true,
      logoPath: null,
      dimensionPresets: [],
      receiptWidthMm: 100,
      receiptHeightMm: null,
    })
    expect(getReceiptSettings(db).receipt_height_mm).toBeNull()
    expect(getReceiptSettings(db).receipt_width_mm).toBe(100)
  })

  it('migration v7: employees cannot see delivered orders by default', () => {
    const db = createDatabase(':memory:')
    expect(getReceiptSettings(db).employees_see_delivered).toBe(false)
  })

  it('migration v8: employees can collect and deliver by default', () => {
    const db = createDatabase(':memory:')
    expect(getReceiptSettings(db).employees_can_collect_deliver).toBe(true)
  })

  it('migration v9: employees cannot access Delivery by default', () => {
    const db = createDatabase(':memory:')
    expect(getReceiptSettings(db).employees_can_access_delivery).toBe(false)
  })

  it('round-trips the employees_see_delivered flag', () => {
    const db = createDatabase(':memory:')
    updateReceiptSettings(db, {
      storeName: 'My Life Mattress',
      defaultDepositPercentages: [30],
      showDeliveryNote: true,
      showPhoneOnReceipt: true,
      showQuantityOnReceipt: true,
      logoPath: null,
      dimensionPresets: [],
      employeesSeeDelivered: true,
    })
    expect(getReceiptSettings(db).employees_see_delivered).toBe(true)
  })

  it('round-trips the employees_can_collect_deliver flag', () => {
    const db = createDatabase(':memory:')
    updateReceiptSettings(db, {
      storeName: 'My Life Mattress',
      defaultDepositPercentages: [30],
      showDeliveryNote: true,
      showPhoneOnReceipt: true,
      showQuantityOnReceipt: true,
      logoPath: null,
      dimensionPresets: [],
      employeesCanCollectDeliver: false,
    })
    expect(getReceiptSettings(db).employees_can_collect_deliver).toBe(false)
  })

  it('round-trips the employees_can_access_delivery flag', () => {
    const db = createDatabase(':memory:')
    updateReceiptSettings(db, {
      storeName: 'My Life Mattress',
      defaultDepositPercentages: [30],
      showDeliveryNote: true,
      showPhoneOnReceipt: true,
      showQuantityOnReceipt: true,
      logoPath: null,
      dimensionPresets: [],
      employeesCanAccessDelivery: true,
    })
    expect(getReceiptSettings(db).employees_can_access_delivery).toBe(true)
  })

  it('upgrade from v8: defaults delivery access off and preserves the other delivery flags', () => {
    const db = createDatabase(':memory:')
    updateReceiptSettings(db, {
      storeName: 'My Life Mattress',
      defaultDepositPercentages: [30],
      showDeliveryNote: true,
      showPhoneOnReceipt: true,
      showQuantityOnReceipt: true,
      logoPath: null,
      dimensionPresets: [],
      employeesSeeDelivered: true,
      employeesCanCollectDeliver: false,
    })
    db.exec(`
      ALTER TABLE receipt_settings DROP COLUMN employees_can_access_delivery;
      DELETE FROM _migrations WHERE version = 9;
    `)
    applyMigrations(db)
    const settings = getReceiptSettings(db)
    expect(settings.employees_can_access_delivery).toBe(false)
    expect(settings.employees_see_delivered).toBe(true)
    expect(settings.employees_can_collect_deliver).toBe(false)
  })
})
