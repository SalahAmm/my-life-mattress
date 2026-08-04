import { describe, expect, it } from 'vitest'
import { logoUrlFor, saleReceiptHtml, sampleSaleForPreview } from './receipt-preview'
import type { ReceiptSettings, SaleWithDetails } from '@shared/types'

const settings: ReceiptSettings = {
  id: 1,
  store_name: 'My Life Mattress',
  logo_path: null,
  default_deposit_percentages: [30],
  dimension_presets: [],
  show_delivery_note: true,
  show_phone_on_receipt: true,
  show_quantity_on_receipt: true,
  receipt_width_mm: 80,
  receipt_height_mm: null,
  receipt_font_scale: 1,
  employees_see_delivered: false,
  employees_can_collect_deliver: true,
  employees_can_access_delivery: false,
  updated_at: '',
}

describe('receipt preview edge cases', () => {
  it('falls back to the brand logo when no logo is uploaded', () => {
    expect(logoUrlFor(null)).toBe('brand/logo.png')
    expect(logoUrlFor('C:/data/logos/logo.png')).toBe('app-asset://logos/logo.png')
  })

  it('renders long product names at 58 mm and 80 mm without throwing', () => {
    const sale: SaleWithDetails = {
      ...sampleSaleForPreview(),
      customer_name: 'Un client avec un très très très long nom pour tester le retour à la ligne',
      items: [
        {
          ...sampleSaleForPreview().items[0],
          product_name: 'Matelas Orthopédique Premium Memory Mousse Ultra Douce 160x190',
        },
      ],
    }
    for (const width of [58, 80]) {
      const html = saleReceiptHtml(sale, { ...settings, receipt_width_mm: width })
      expect(html).toContain('Matelas Orthopédique Premium Memory Mousse Ultra Douce 160x190')
      expect(html).toContain('Un client avec un très très très long nom pour tester le retour à la ligne')
    }
  })

  it('renders the full preview for the sample sale', () => {
    const html = saleReceiptHtml(sampleSaleForPreview(), settings)
    expect(html.length).toBeGreaterThan(1000)
    expect(html).toContain('My Life Mattress')
  })
})
