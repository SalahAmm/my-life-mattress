import type { ReceiptSettings, SaleWithDetails } from '../types'
import { formatDzd } from '../money'

export interface ReceiptFontUrls {
  inter: { 400: string; 600: string; 700: string }
  notoArabic: { 400: string; 600: string; 700: string }
}

function fontFaces(urls: ReceiptFontUrls): string {
  const face = (family: string, weight: number, url: string) =>
    `@font-face { font-family: '${family}'; src: url('${url}') format('woff2'); font-weight: ${weight}; }`
  return [
    face('Inter', 400, urls.inter[400]),
    face('Inter', 600, urls.inter[600]),
    face('Inter', 700, urls.inter[700]),
    face('Noto Sans Arabic', 400, urls.notoArabic[400]),
    face('Noto Sans Arabic', 600, urls.notoArabic[600]),
    face('Noto Sans Arabic', 700, urls.notoArabic[700]),
  ].join('\n')
}

export interface ReceiptTemplateInput {
  sale: SaleWithDetails
  settings: ReceiptSettings
  fontUrls: ReceiptFontUrls
  logoSrc: string | null
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function money(value: number): string {
  return `<span dir="ltr">${formatDzd(value)}</span>`
}

export function renderReceiptHtml(input: ReceiptTemplateInput): string {
  const { sale, settings, fontUrls, logoSrc } = input
  const deposit = sale.payments.find((p) => p.type === 'deposit')
  const depositPercent = deposit?.entered_as_percentage != null ? Math.round((deposit.amount / sale.total) * 100) : null

  const itemRows = sale.items
    .map((item) => {
      const name = item.product_variant_id != null
        ? `${item.product_name ?? ''} ${item.dimension ?? ''}`.trim()
        : (item.custom_description ?? '')
      const qty = settings.show_quantity_on_receipt
        ? `<span dir="ltr">${item.quantity} × ${formatDzd(item.unit_price_at_sale)}</span>`
        : `<span dir="ltr">${formatDzd(item.unit_price_at_sale)}</span>`
      return `
        <div class="item">
          <div class="item-name" dir="auto">${escapeHtml(name)}</div>
          <div class="item-line">
            ${qty}
            <span class="right" dir="ltr">${formatDzd(item.quantity * item.unit_price_at_sale)}</span>
          </div>
        </div>`
    })
    .join('')

  const paymentBlock = deposit
    ? `
        <div class="pay-row">
          <span>${depositPercent != null ? `Acompte (${depositPercent}%)` : 'Acompte'}</span>
          <span class="right" dir="ltr">${formatDzd(deposit.amount)}</span>
        </div>`
    : ''

  const deliveryNote = settings.show_delivery_note
    ? `<div class="delivery-note">Livraison Gratuite / توصيل مجاني</div>`
    : ''

  const addressLine = sale.delivery_address
    ? `<div class="address" dir="auto">${escapeHtml(sale.delivery_address)}</div>`
    : ''
  const wilayaLine = sale.wilaya ? `<div class="address" dir="auto">${escapeHtml(sale.wilaya)}</div>` : ''

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Ticket De Commande</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 80mm;
    padding: 6mm 4mm;
    font-family: 'Inter', 'Noto Sans Arabic', sans-serif;
    font-size: 11px;
    color: #111;
    background: #fff;
  }
  ${fontFaces(fontUrls)}
  .center { text-align: center; }
  .store-name { font-size: 15px; font-weight: 800; }
  .store-name-ar { font-size: 12px; font-weight: 700; }
  .doc-label { font-size: 11px; margin-top: 2px; font-weight: 600; }
  .rule { border-top: 1px dashed #666; margin: 6px 0; }
  .client { margin-top: 6px; }
  .client .name { font-weight: 700; font-size: 12px; }
  .client .phone { color: #333; margin-top: 1px; }
  .items { margin-top: 4px; }
  .item { margin-top: 5px; }
  .item-name { font-weight: 600; }
  .item-line { display: flex; justify-content: space-between; color: #333; }
  .right { white-space: nowrap; }
  .total-row { display: flex; justify-content: space-between; font-weight: 800; font-size: 13px; padding-top: 6px; }
  .pay-row { display: flex; justify-content: space-between; margin-top: 4px; }
  .remaining { display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; margin-top: 8px; }
  .remaining span.right { color: #000; }
  .delivery-note { text-align: center; margin-top: 8px; font-weight: 700; }
  .footer { text-align: center; margin-top: 8px; color: #555; font-size: 9px; }
  .address { color: #333; margin-top: 1px; }
  .logo { max-width: 40mm; max-height: 15mm; object-fit: contain; margin-bottom: 4px; }
</style>
</head>
<body>
  <div class="center">
    ${logoSrc ? `<img class="logo" src="${logoSrc}" alt="" />` : ''}
    <div class="store-name">${escapeHtml(settings.store_name)}</div>
    <div class="store-name-ar">ماي لايف ماتراس</div>
    <div class="doc-label">Ticket De Commande / تذكرة الطلب</div>
  </div>
  <div class="rule"></div>
  <div class="client">
    <div class="name" dir="auto">${escapeHtml(sale.customer_name ?? '')}</div>
    ${sale.customer_phone && settings.show_phone_on_receipt ? `<div class="phone" dir="ltr">${escapeHtml(sale.customer_phone)}</div>` : ''}
    ${wilayaLine}
    ${addressLine}
  </div>
  <div class="rule"></div>
  <div class="items">${itemRows}</div>
  <div class="rule"></div>
  <div class="total-row">
    <span>Total</span>
    <span class="right">${money(sale.total)}</span>
  </div>
  ${paymentBlock}
  <div class="rule"></div>
  <div class="remaining">
    <span>RESTE À PAYER / المبلغ المتبقي</span>
    <span class="right">${money(sale.remaining)}</span>
  </div>
  ${deliveryNote}
  <div class="footer">N° ${String(sale.id).padStart(4, '0')} &nbsp;•&nbsp; <span dir="ltr">${escapeHtml(new Date(sale.created_at).toLocaleDateString('fr-FR'))}</span></div>
</body>
</html>`
}
