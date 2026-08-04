import type { Database } from 'better-sqlite3'
import { BrowserWindow, shell } from 'electron'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import type { ReceiptFontUrls } from '@shared/printing/receipt'
import { renderReceiptHtml } from '@shared/printing/receipt'
import { renderReportHtml } from '@shared/printing/report'
import type { SaleWithDetails } from '@shared/types'
import { getReceiptSettings } from '../db/queries/receipt-settings'
import { getSale } from '../db/queries/sales'
import { reportSummary, type ReportRange } from '../db/queries/reports'
import { chooseLogoSrc } from './logo'

const fontCache = new Map<string, string>()

function fontDataUri(fileName: string): string {
  const cached = fontCache.get(fileName)
  if (cached) return cached
  const filePath = path.join(__dirname, 'assets', 'fonts', fileName)
  const base64 = fs.readFileSync(filePath).toString('base64')
  const uri = `data:font/woff2;base64,${base64}`
  fontCache.set(fileName, uri)
  return uri
}

export function mainProcessFontUrls(): ReceiptFontUrls {
  const inter = (w: 400 | 600 | 700) => fontDataUri(`inter-latin-${w}-normal.woff2`)
  const arabic = (w: 400 | 600 | 700) => fontDataUri(`noto-sans-arabic-arabic-${w}-normal.woff2`)
  return {
    inter: { 400: inter(400), 600: inter(600), 700: inter(700) },
    notoArabic: { 400: arabic(400), 600: arabic(600), 700: arabic(700) },
  }
}

function writeTempFile(data: string | Buffer, ext: string, label: string): string {
  const dir = path.join(os.tmpdir(), 'mlm-print')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${label}-${crypto.randomUUID()}.${ext}`)
  fs.writeFileSync(file, data)
  setTimeout(() => {
    fs.rmSync(file, { force: true })
  }, 10 * 60 * 1000).unref()
  return file
}

async function pdfForHtml(html: string): Promise<Buffer> {
  const tempFile = writeTempFile(html, 'html', 'pdf-src')
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true },
  })
  try {
    await win.loadFile(tempFile)
    return await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true })
  } finally {
    win.destroy()
  }
}

async function openPdf(pdf: Buffer, label: string): Promise<{ success: boolean; reason?: string }> {
  const file = writeTempFile(pdf, 'pdf', label)
  const errorMessage = await shell.openPath(file)
  if (errorMessage) {
    return { success: false, reason: errorMessage }
  }
  return { success: true }
}

let brandLogoUri: string | null | undefined

function brandLogoDataUri(): string | null {
  if (brandLogoUri !== undefined) return brandLogoUri
  try {
    const filePath = path.join(__dirname, 'assets', 'brand', 'logo.png')
    if (!fs.existsSync(filePath)) {
      brandLogoUri = null
      return null
    }
    brandLogoUri = `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`
  } catch {
    brandLogoUri = null
  }
  return brandLogoUri
}

export function receiptHtmlForSale(db: Database, saleId: number): string {
  const sale = getSale(db, saleId)
  const settings = getReceiptSettings(db)
  return renderReceiptHtml({
    sale,
    settings,
    fontUrls: mainProcessFontUrls(),
    logoSrc: chooseLogoSrc(settings.logo_path ? logoDataUri(settings.logo_path) : null, brandLogoDataUri()),
  })
}

export async function printReceipt(db: Database, saleId: number): Promise<{ success: boolean; reason?: string }> {
  try {
    const pdf = await pdfForHtml(receiptHtmlForSale(db, saleId))
    return await openPdf(pdf, `ticket-${saleId}`)
  } catch (error) {
    return { success: false, reason: error instanceof Error ? error.message : 'unknown' }
  }
}

function sampleSaleForPrint(): SaleWithDetails {
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
    free_delivery: true,
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
        variant_name: null,
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
        variant_name: null,
      },
    ],
    payments: [{ id: 1, sale_id: 0, amount: 17100, type: 'deposit', entered_as_percentage: 30, created_at: '' }],
    total: 57000,
    paid: 17100,
    remaining: 39900,
  }
}

export function sampleReceiptHtml(db: Database): string {
  const settings = getReceiptSettings(db)
  return renderReceiptHtml({
    sale: sampleSaleForPrint(),
    settings,
    fontUrls: mainProcessFontUrls(),
    logoSrc: chooseLogoSrc(settings.logo_path ? logoDataUri(settings.logo_path) : null, brandLogoDataUri()),
  })
}

export async function printTestReceipt(db: Database): Promise<{ success: boolean; reason?: string }> {
  try {
    const pdf = await pdfForHtml(sampleReceiptHtml(db))
    return await openPdf(pdf, 'receipt-test')
  } catch (error) {
    return { success: false, reason: error instanceof Error ? error.message : 'unknown' }
  }
}

export function reportHtmlForRange(db: Database, range: ReportRange, rangeLabel: string): string {
  const settings = getReceiptSettings(db)
  const summary = reportSummary(db, range)
  const rows = db
    .prepare(
      `SELECT id FROM sales
       WHERE created_at >= ? AND created_at < ? AND status != 'cancelled'
       ORDER BY created_at DESC`,
    )
    .all(range.from, range.to) as { id: number }[]
  const sales = rows.map((r) => getSale(db, r.id))
  return renderReportHtml({ settings, summary, sales, fontUrls: mainProcessFontUrls(), rangeLabel, range })
}

export async function printReport(db: Database, range: ReportRange, rangeLabel: string): Promise<{ success: boolean; reason?: string }> {
  try {
    const pdf = await pdfForHtml(reportHtmlForRange(db, range, rangeLabel))
    return await openPdf(pdf, 'sales-report')
  } catch (error) {
    return { success: false, reason: error instanceof Error ? error.message : 'unknown' }
  }
}

function logoDataUri(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().replace('.', '')
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  const base64 = fs.readFileSync(filePath).toString('base64')
  return `data:${mime};base64,${base64}`
}
