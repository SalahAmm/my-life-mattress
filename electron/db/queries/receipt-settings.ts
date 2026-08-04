import type { Database } from 'better-sqlite3'
import type { ReceiptSettings } from '@shared/types'

function rowToSettings(row: {
  store_name: string
  logo_path: string | null
  default_deposit_percentages: string
  dimension_presets: string
  show_delivery_note: number
  show_phone_on_receipt: number
  show_quantity_on_receipt: number
  receipt_width_mm: number
  receipt_height_mm: number | null
  receipt_font_scale: number
  employees_see_delivered: number
  employees_can_collect_deliver: number
  employees_can_access_delivery: number
}): ReceiptSettings {
  return {
    id: 1,
    store_name: row.store_name,
    logo_path: row.logo_path,
    default_deposit_percentages: JSON.parse(row.default_deposit_percentages) as number[],
    dimension_presets: JSON.parse(row.dimension_presets) as string[],
    show_delivery_note: Boolean(row.show_delivery_note),
    show_phone_on_receipt: Boolean(row.show_phone_on_receipt),
    show_quantity_on_receipt: Boolean(row.show_quantity_on_receipt),
    receipt_width_mm: row.receipt_width_mm,
    receipt_height_mm: row.receipt_height_mm,
    receipt_font_scale: row.receipt_font_scale,
    employees_see_delivered: Boolean(row.employees_see_delivered),
    employees_can_collect_deliver: Boolean(row.employees_can_collect_deliver),
    employees_can_access_delivery: Boolean(row.employees_can_access_delivery),
    updated_at: '',
  }
}

export function getReceiptSettings(db: Database): ReceiptSettings {
  const row = db
    .prepare('SELECT * FROM receipt_settings WHERE id = 1')
    .get() as {
    store_name: string
    logo_path: string | null
    default_deposit_percentages: string
    dimension_presets: string
    show_delivery_note: number
    show_phone_on_receipt: number
    show_quantity_on_receipt: number
    receipt_width_mm: number
    receipt_height_mm: number | null
    receipt_font_scale: number
    employees_see_delivered: number
    employees_can_collect_deliver: number
    employees_can_access_delivery: number
  }
  return rowToSettings(row)
}

export function updateReceiptSettings(
  db: Database,
  input: {
    storeName: string
    logoPath: string | null
    defaultDepositPercentages: number[]
    showDeliveryNote: boolean
    showPhoneOnReceipt: boolean
    showQuantityOnReceipt: boolean
    dimensionPresets: string[]
    receiptWidthMm?: number
    receiptHeightMm?: number | null
    receiptFontScale?: number
    employeesSeeDelivered?: boolean
    employeesCanCollectDeliver?: boolean
    employeesCanAccessDelivery?: boolean
  },
): void {
  db.prepare(
    `UPDATE receipt_settings SET
      store_name = ?,
      logo_path = ?,
      default_deposit_percentages = ?,
      dimension_presets = ?,
      show_delivery_note = ?,
      show_phone_on_receipt = ?,
      show_quantity_on_receipt = ?,
      receipt_width_mm = ?,
      receipt_height_mm = ?,
      receipt_font_scale = ?,
      employees_see_delivered = ?,
      employees_can_collect_deliver = ?,
      employees_can_access_delivery = ?,
      updated_at = ?
     WHERE id = 1`,
  ).run(
    input.storeName,
    input.logoPath,
    JSON.stringify(input.defaultDepositPercentages),
    JSON.stringify(input.dimensionPresets),
    input.showDeliveryNote ? 1 : 0,
    input.showPhoneOnReceipt ? 1 : 0,
    input.showQuantityOnReceipt ? 1 : 0,
    input.receiptWidthMm ?? 80,
    input.receiptHeightMm ?? null,
    input.receiptFontScale ?? 1,
    input.employeesSeeDelivered ? 1 : 0,
    input.employeesCanCollectDeliver ? 1 : 0,
    input.employeesCanAccessDelivery ? 1 : 0,
    new Date().toISOString(),
  )
}
