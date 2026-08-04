import { describe, expect, it } from 'vitest'
import type { ReceiptSettings, SaleWithDetails } from '../types'
import { renderReceiptHtml } from './receipt'

const settings: ReceiptSettings = {
  id: 1,
  store_name: 'My Life Mattress',
  logo_path: null,
  default_deposit_percentages: [30, 50, 70],
  dimension_presets: ['90x190', '160x190', '180x200'],
  show_delivery_note: true,
  show_phone_on_receipt: true,
  show_quantity_on_receipt: true,
  updated_at: '',
}

function sale(overrides: Partial<SaleWithDetails> = {}): SaleWithDetails {
  return {
    id: 12,
    customer_id: 1,
    customer_name: 'Ahmed Benali',
    customer_phone: '0550123456',
    free_delivery: false,
    created_by: 1,
    created_by_username: 'Kamel',
    status: 'ordered',
    wilaya: 'Alger',
    delivery_address: 'Rue des Frères',
    created_at: '2026-08-03T10:00:00.000Z',
    items: [
      {
        id: 1,
        sale_id: 12,
        product_variant_id: 1,
        quantity: 2,
        unit_price_at_sale: 45000,
        custom_description: null,
        product_name: 'Matelas Orthopédique Elite',
        dimension: '160x190',
        variant_name: null,
      },
    ],
    payments: [],
    total: 90000,
    paid: 0,
    remaining: 90000,
    ...overrides,
  }
}

function render(
  overrides: Partial<SaleWithDetails> = {},
  settingsOverrides: Partial<ReceiptSettings> = {},
  logoSrc: string | null = null,
) {
  return renderReceiptHtml({
    sale: sale(overrides),
    settings: { ...settings, ...settingsOverrides },
    fontUrls: {
      inter: { 400: 'fonts/i400.woff2', 600: 'fonts/i600.woff2', 700: 'fonts/i700.woff2' },
      notoArabic: { 400: 'fonts/a400.woff2', 600: 'fonts/a600.woff2', 700: 'fonts/a700.woff2' },
    },
    logoSrc,
  })
}

describe('receipt template', () => {
  it('shows the bilingual store header and document label', () => {
    const html = render()
    expect(html).toContain('My Life Mattress')
    expect(html).toContain('ماي لايف ماتراس')
    expect(html).toContain('Ticket De Commande / تذكرة الطلب')
  })

  it('lists catalog items with dimension, quantity, unit price and line total', () => {
    const html = render()
    expect(html).toContain('Matelas Orthopédique Elite 160x190')
    expect(html).toContain('2 × 45 000 DZD')
    expect(html).toContain('90 000 DZD')
  })

  it('renders multiple line items', () => {
    const html = render({
      items: [
        sale().items[0],
        {
          id: 2,
          sale_id: 12,
          product_variant_id: null,
          quantity: 1,
          unit_price_at_sale: 12000,
          custom_description: 'Dimension Personnalisée: 170x200',
          product_name: null,
          dimension: null,
          variant_name: null,
        },
      ],
      total: 102000,
    })
    expect(html).toContain('Matelas Orthopédique Elite 160x190')
    expect(html).toContain('Dimension Personnalisée: 170x200')
    expect(html).toContain('102 000 DZD')
  })

  it('renders a custom item from its description', () => {
    const html = render({
      items: [
        {
          id: 3,
          sale_id: 12,
          product_variant_id: null,
          quantity: 1,
          unit_price_at_sale: 70000,
          custom_description: 'Cadre Sur Mesure 200x200',
          product_name: null,
          dimension: null,
          variant_name: null,
        },
      ],
      total: 70000,
    })
    expect(html).toContain('Cadre Sur Mesure 200x200')
  })

  it('shows customer name, phone and address', () => {
    const html = render()
    expect(html).toContain('Ahmed Benali')
    expect(html).toContain('0550123456')
    expect(html).toContain('Rue des Frères')
  })

  it('shows the total separated by a rule', () => {
    const html = render()
    expect(html).toContain('Total')
    expect(html).toContain('90 000 DZD')
    expect(html.match(/rule/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('shows a deposit with the computed percentage when entered as percentage', () => {
    const html = render({
      total: 90000,
      paid: 27000,
      remaining: 63000,
      payments: [{ id: 1, sale_id: 12, amount: 27000, type: 'deposit', entered_as_percentage: 30, created_at: '' }],
    })
    expect(html).toContain('Acompte (30%)')
    expect(html).toContain('27 000 DZD')
  })

  it('computes the actual percentage, never the stored one', () => {
    const html = render({
      total: 90000,
      paid: 27000,
      remaining: 63000,
      payments: [{ id: 1, sale_id: 12, amount: 27000, type: 'deposit', entered_as_percentage: 50, created_at: '' }],
    })
    expect(html).toContain('Acompte (30%)')
    expect(html).not.toContain('Acompte (50%)')
  })

  it('shows a flat deposit without a percentage', () => {
    const html = render({
      total: 90000,
      paid: 5000,
      remaining: 85000,
      payments: [{ id: 1, sale_id: 12, amount: 5000, type: 'deposit', entered_as_percentage: null, created_at: '' }],
    })
    expect(html).toContain('Acompte')
    expect(html).not.toContain('Acompte (')
  })

  it('always shows the remaining balance prominently', () => {
    const html = render({ paid: 0, remaining: 90000 })
    expect(html).toContain('RESTE À PAYER / المبلغ المتبقي')
    expect(html).toContain('90 000 DZD')
  })

  it('includes the delivery note only when enabled in settings AND the sale has free delivery', () => {
    expect(render({ free_delivery: true }).indexOf('Livraison Gratuite')).toBeGreaterThan(0)
    expect(render({}, { show_delivery_note: false })).not.toContain('Livraison Gratuite')
    expect(render({ free_delivery: false })).not.toContain('Livraison Gratuite')
  })

  it('escapes untrusted text from data fields', () => {
    const html = render({ customer_name: '<script>alert(1)</script>' })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('wraps amounts in LTR spans', () => {
    const html = render()
    expect(html).toContain('<span dir="ltr">90 000 DZD</span>')
  })

  it('includes the sale number and date footer', () => {
    const html = render()
    expect(html).toContain('N° 0012')
  })

  it('renders a bed color variant as name — size', () => {
    const html = render({
      items: [
        {
          id: 5,
          sale_id: 12,
          product_variant_id: 9,
          quantity: 1,
          unit_price_at_sale: 80000,
          custom_description: null,
          product_name: 'Lit Sierra',
          dimension: null,
          variant_name: 'Sahara',
        },
      ],
      total: 80000,
    })
    expect(html).toContain('Lit Sierra Sahara')
  })

  it('embeds the logo when a logo source is provided', () => {
    const html = render({}, {}, 'app-asset://logos/logo.png')
    expect(html).toContain('<img class="logo"')
    expect(html).toContain('app-asset://logos/logo.png')
  })

  it('hides the customer phone when show_phone_on_receipt is off', () => {
    const html = render({}, { show_phone_on_receipt: false })
    expect(html).not.toContain('0550123456')
  })

  it('hides quantities when show_quantity_on_receipt is off', () => {
    const html = render({}, { show_quantity_on_receipt: false })
    expect(html).not.toContain('2 ×')
    expect(html).toContain('90')
  })

  it('uses the configured store name', () => {
    const html = render({}, { store_name: 'Rafik Matelas' })
    expect(html).toContain('Rafik Matelas')
  })

  it('supports Arabic product names via dir=auto', () => {
    const html = render({
      items: [
        {
          id: 4,
          sale_id: 12,
          product_variant_id: null,
          quantity: 1,
          unit_price_at_sale: 40000,
          custom_description: 'فرشة سرير 170x200',
          product_name: null,
          dimension: null,
          variant_name: null,
        },
      ],
      total: 40000,
    })
    expect(html).toContain('dir="auto"')
    expect(html).toContain('فرشة سرير 170x200')
  })
})

describe('receipt format settings', () => {
  it('defaults to 80mm wide, auto height and normal text', () => {
    const html = render()
    expect(html).toContain('@page { size: 80mm auto; margin: 0; }')
    expect(html).toContain('width: 80mm;')
    expect(html).toContain('font-size: 11px;')
  })

  it('applies a custom width, fixed height and font scale', () => {
    const html = render({}, { receipt_width_mm: 58, receipt_height_mm: 300, receipt_font_scale: 1.2 })
    expect(html).toContain('@page { size: 58mm 300mm; margin: 0; }')
    expect(html).toContain('width: 58mm;')
    expect(html).toContain('font-size: 13px;')
    expect(html).toContain('.store-name { font-size: 18px;')
  })

  it('scales the receipt text down for the small preset', () => {
    const html = render({}, { receipt_font_scale: 0.85 })
    expect(html).toContain('font-size: 9px;')
  })
})
