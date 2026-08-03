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
    new Date().toISOString(),
  )
}
