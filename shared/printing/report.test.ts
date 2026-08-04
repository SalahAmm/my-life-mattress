import { describe, expect, it } from 'vitest'
import type { ReceiptSettings, SaleWithDetails } from '../types'
import type { ReportSummary } from '../ipc'
import { renderReportHtml } from './report'

const settings: ReceiptSettings = {
  id: 1,
  store_name: 'My Life Mattress',
  logo_path: null,
  default_deposit_percentages: [30, 50, 70],
  dimension_presets: ['90x190'],
  show_delivery_note: true,
  show_phone_on_receipt: true,
  show_quantity_on_receipt: true,
  updated_at: '',
}

const summary: ReportSummary = {
  revenue: 105000,
  depositsCollected: 13500,
  outstanding: 46500,
  salesCount: 2,
  perProduct: [
    { label: 'Matelas Elite 160x190', units: 1, revenue: 60000 },
    { label: 'Lit Sierra Sahara', units: 1, revenue: 45000 },
  ],
}

const sale: SaleWithDetails = {
  id: 1,
  customer_id: 1,
  customer_name: 'Ahmed Benali',
  customer_phone: '0550123456',
  created_by: 1,
  created_by_username: 'Kamel',
  status: 'ordered',
  wilaya: 'Alger',
  delivery_address: null,
  free_delivery: false,
  created_at: '2026-08-03T10:00:00.000Z',
  items: [
    {
      id: 1,
      sale_id: 1,
      product_variant_id: 10,
      quantity: 2,
      unit_price_at_sale: 30000,
      custom_description: null,
      product_name: 'Matelas Elite',
      dimension: '160x190',
      variant_name: null,
    },
  ],
  payments: [],
  total: 60000,
  paid: 0,
  remaining: 60000,
}

const fontUrls = {
  inter: { 400: 'f', 600: 'f', 700: 'f' },
  notoArabic: { 400: 'f', 600: 'f', 700: 'f' },
}

describe('renderReportHtml (ticket 03)', () => {
  it('renders an A4 report with totals and the breakdown table', () => {
    const html = renderReportHtml({
      settings,
      summary,
      sales: [sale],
      fontUrls,
      rangeLabel: 'Aujourd\'hui',
      range: { from: '2026-08-01T00:00:00.000Z', to: '2026-08-02T00:00:00.000Z' },
    })
    expect(html).toContain('My Life Mattress')
    expect(html).toContain('Aujourd&#39;hui')
    expect(html).toContain('105')
    expect(html).toContain('46')
    expect(html).toContain('Matelas Elite 160x190')
    expect(html).toContain('Ahmed Benali')
    expect(html).toContain('Matelas Elite 160x190 ×2')
    expect(html).toContain('@page')
    expect(html).toContain('size: A4')
  })
})
