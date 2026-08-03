import type { ReceiptFontUrls } from '@shared/printing/receipt'
import { renderReceiptHtml } from '@shared/printing/receipt'
import type { ReceiptSettings, SaleWithDetails } from '@shared/types'

export const PREVIEW_FONT_URLS: ReceiptFontUrls = {
  inter: {
    400: 'fonts/inter-latin-400-normal.woff2',
    600: 'fonts/inter-latin-600-normal.woff2',
    700: 'fonts/inter-latin-700-normal.woff2',
  },
  notoArabic: {
    400: 'fonts/noto-sans-arabic-arabic-400-normal.woff2',
    600: 'fonts/noto-sans-arabic-arabic-600-normal.woff2',
    700: 'fonts/noto-sans-arabic-arabic-700-normal.woff2',
  },
}

export function logoUrlFor(logoPath: string | null): string | null {
  if (!logoPath) return null
  const name = logoPath.split(/[\\/]/).pop() ?? ''
  return `app-asset://logos/${encodeURIComponent(name)}`
}

export function saleReceiptHtml(sale: SaleWithDetails, settings: ReceiptSettings): string {
  return renderReceiptHtml({
    sale,
    settings,
    fontUrls: PREVIEW_FONT_URLS,
    logoSrc: logoUrlFor(settings.logo_path),
  })
}

export function sampleSaleForPreview(): SaleWithDetails {
  return {
    id: 0,
    customer_id: null,
    customer_name: 'Exemple de client',
    customer_phone: '0550123456',
    created_by: 1,
    created_by_username: 'Kamel',
    status: 'ordered',
    wilaya: 'Alger',
    delivery_address: 'Cité 5 Juillet',
    created_at: new Date().toISOString(),
    items: [
      {
        id: 1,
        sale_id: 0,
        product_variant_id: 1,
        quantity: 1,
        unit_price_at_sale: 45000,
        custom_description: null,
        product_name: 'Matelas Orthopédique Elite',
        dimension: '160×190',
      },
      {
        id: 2,
        sale_id: 0,
        product_variant_id: null,
        quantity: 1,
        unit_price_at_sale: 12000,
        custom_description: 'Dimension Personnalisée: 170×200',
        product_name: null,
        dimension: null,
      },
    ],
    payments: [{ id: 1, sale_id: 0, amount: 17100, type: 'deposit', entered_as_percentage: 30, created_at: '' }],
    total: 57000,
    paid: 17100,
    remaining: 39900,
  }
}
