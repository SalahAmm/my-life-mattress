import type { ReceiptSettings, SaleWithDetails } from '../types'
import type { ReportRange, ReportSummary } from '../ipc'
import type { ReceiptFontUrls } from './receipt'
import { formatDzd } from '../money'
import { saleItemsLabel } from '../variants'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export interface ReportTemplateInput {
  settings: ReceiptSettings
  summary: ReportSummary
  sales: SaleWithDetails[]
  fontUrls: ReceiptFontUrls
  rangeLabel: string
  range: ReportRange
}

export function renderReportHtml(input: ReportTemplateInput): string {
  const { settings, summary, sales, fontUrls, rangeLabel } = input
  const face = (family: string, weight: number, url: string) =>
    `@font-face { font-family: '${family}'; src: url('${url}') format('woff2'); font-weight: ${weight}; }`
  const fontCss = [
    face('Inter', 400, fontUrls.inter[400]),
    face('Inter', 700, fontUrls.inter[700]),
    face('Noto Sans Arabic', 400, fontUrls.notoArabic[400]),
    face('Noto Sans Arabic', 700, fontUrls.notoArabic[700]),
  ].join('\n')

  const productRows = summary.perProduct
    .map(
      (item, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td dir="auto">${escapeHtml(item.label)}</td>
        <td class="center">${item.units}</td>
        <td class="right">${formatDzd(item.revenue)}</td>
      </tr>`,
    )
    .join('')

  const saleRows = sales
    .map(
      (sale) => `
      <tr>
        <td dir="ltr">${String(sale.id).padStart(4, '0')}</td>
        <td dir="auto">${escapeHtml(sale.customer_name ?? '')}</td>
        <td dir="auto">${escapeHtml(saleItemsLabel(sale.items))}</td>
        <td dir="auto">${escapeHtml(sale.wilaya ?? '—')}</td>
        <td class="right">${formatDzd(sale.total)}</td>
        <td class="right">${formatDzd(sale.paid)}</td>
        <td class="right">${formatDzd(sale.remaining)}</td>
      </tr>`,
    )
    .join('')

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Rapport des ventes</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Noto Sans Arabic', sans-serif;
    font-size: 12px;
    color: #111;
    background: #fff;
  }
  ${fontCss}
  h1 { font-size: 18px; font-weight: 700; }
  .sub { color: #555; margin-top: 2px; }
  .rule { border-top: 2px solid #111; margin: 8px 0 12px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .kpi { border: 1px solid #ccc; padding: 8px; }
  .kpi .label { font-size: 10px; color: #555; }
  .kpi .value { font-size: 14px; font-weight: 700; }
  h2 { font-size: 13px; margin: 12px 0 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: start; }
  th { background: #eee; font-weight: 700; }
  td.right, th.right { text-align: end; }
  td.center, th.center { text-align: center; }
  .footer { margin-top: 20px; color: #555; font-size: 10px; text-align: center; }
</style>
</head>
<body>
  <h1>${escapeHtml(settings.store_name)} — Rapport des ventes</h1>
  <p class="sub">${escapeHtml(rangeLabel)}</p>
  <div class="rule"></div>
  <div class="kpis">
    <div class="kpi"><div class="label">Chiffre d'affaires</div><div class="value">${formatDzd(summary.revenue)}</div></div>
    <div class="kpi"><div class="label">Acomptes collectés</div><div class="value">${formatDzd(summary.depositsCollected)}</div></div>
    <div class="kpi"><div class="label">Solde en attente</div><div class="value">${formatDzd(summary.outstanding)}</div></div>
    <div class="kpi"><div class="label">Nombre de ventes</div><div class="value">${summary.salesCount}</div></div>
  </div>
  <h2>Produits les plus vendus</h2>
  <table>
    <thead>
      <tr><th class="center">#</th><th>Produit</th><th class="center">Qté</th><th class="right">Montant</th></tr>
    </thead>
    <tbody>${productRows}</tbody>
  </table>
  <h2>Ventes de la période</h2>
  <table>
    <thead>
      <tr><th>N°</th><th>Client</th><th>Produits</th><th>Wilaya</th><th class="right">Total</th><th class="right">Payé</th><th class="right">Solde dû</th></tr>
    </thead>
    <tbody>${saleRows}</tbody>
  </table>
  <div class="footer">Généré le ${new Date().toLocaleDateString('fr-FR')} — My Life Mattress</div>
</body>
</html>`
}
