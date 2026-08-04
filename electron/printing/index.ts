import type { Database } from 'better-sqlite3'
import { BrowserWindow, shell } from 'electron'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import crypto from 'node:crypto'
import type { ReceiptFontUrls } from '@shared/printing/receipt'
import { renderReceiptHtml } from '@shared/printing/receipt'
import { renderReportHtml } from '@shared/printing/report'
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

function writeTempHtml(html: string, label: string): string {
  const dir = path.join(os.tmpdir(), 'mlm-print')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${label}-${crypto.randomUUID()}.html`)
  fs.writeFileSync(file, html, 'utf8')
  setTimeout(() => {
    fs.rmSync(file, { force: true })
  }, 10 * 60 * 1000).unref()
  return file
}

export function printHtml(html: string, title: string): Promise<{ success: boolean; reason?: string }> {
  return new Promise((resolve) => {
    const tempFile = writeTempHtml(html, 'print')
    const win = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true, contextIsolation: true },
    })
    win.setTitle(title)
    win.webContents.on('did-finish-load', () => {
      win.webContents.print({ silent: false }, (success, failureReason) => {
        win.destroy()
        resolve({ success, reason: failureReason })
      })
    })
    win.webContents.on('did-fail-load', (_event, _code, desc) => {
      win.destroy()
      resolve({ success: false, reason: desc })
    })
    void win.loadFile(tempFile)
  })
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
  return printHtml(receiptHtmlForSale(db, saleId), `Ticket ${saleId}`)
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
  return printHtml(reportHtmlForRange(db, range, rangeLabel), 'Rapport des ventes')
}

export async function printReportInBrowser(db: Database, range: ReportRange, rangeLabel: string): Promise<{ success: boolean; reason?: string }> {
  return printInBrowser(reportHtmlForRange(db, range, rangeLabel), 'Rapport des ventes')
}

function logoDataUri(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().replace('.', '')
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  const base64 = fs.readFileSync(filePath).toString('base64')
  return `data:${mime};base64,${base64}`
}

export async function printInBrowser(html: string, _title: string): Promise<{ success: boolean; reason?: string }> {
  const tempFile = writeTempHtml(html, 'browser')
  await shell.openExternal(pathToFileURL(tempFile).toString())
  return { success: true }
}
