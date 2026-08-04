import type { Database } from 'better-sqlite3'
import { app, dialog, ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import type { Session } from '@shared/types'
import { AppError } from '@shared/types'
import type { IpcResult } from '@shared/ipc'
import type { AuthService } from '../auth/service'
import { logError } from '../log'
import { listActiveCategories } from '../db/queries/categories'
import { listCounterProducts, createProduct, deactivateProduct, listProducts, listTopSellers, updateProduct } from '../db/queries/products'
import { createSupplier, listSuppliers, setSupplierActive } from '../db/queries/suppliers'
import { adjustStock, listMovementsForVariant, restock } from '../db/queries/stock'
import {
  addPayment,
  cancelSale,
  createSale,
  getSale,
  listRecentSales,
  listSales,
  setSaleStatus,
} from '../db/queries/sales'
import {
  assertCanDeactivateUser,
  createUser,
  findUserById,
  listUsers,
  setUserActive,
  updateUserPassword,
} from '../db/queries/users'
import { hashPassword } from '../auth/password'
import { getReceiptSettings, updateReceiptSettings } from '../db/queries/receipt-settings'
import { reportSummary } from '../db/queries/reports'
import { printInBrowser, printReceipt, printReport, printReportInBrowser, receiptHtmlForSale } from '../printing'

type Handler<TInput, TOutput> = (args: {
  auth: AuthService
  db: Database
  payload: TInput
}) => Promise<TOutput>

function wrap<TInput, TOutput>(handler: Handler<TInput, TOutput>) {
  return async (_event: Electron.IpcMainInvokeEvent, payload: TInput): Promise<IpcResult<TOutput>> => {
    try {
      const data = await handler({ auth, db, payload })
      return { ok: true, data }
    } catch (error) {
      if (error instanceof AppError) {
        return { ok: false, error: { code: error.code, message: error.message } }
      }
      logError('ipc', error)
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: 'Une erreur inattendue est survenue' },
      }
    }
  }
}

function requireSession(auth: AuthService): Session {
  const session = auth.getSession()
  if (!session) {
    throw new AppError('UNAUTHORIZED', 'Not authenticated')
  }
  return session
}

export function requireOwner(auth: AuthService): Session {
  const session = requireSession(auth)
  if (session.role !== 'owner') {
    throw new AppError('UNAUTHORIZED', 'Owner role required')
  }
  return session
}

export const SALE_SCHEMA = z.object({
  customerName: z.string().trim().min(1).max(200),
  customerPhone: z.string().trim().max(30).nullable(),
  wilaya: z.string().trim().max(100).nullable(),
  deliveryAddress: z.string().trim().max(500).nullable(),
  freeDelivery: z.boolean().optional(),
  items: z
    .array(
      z.object({
        productVariantId: z.number().int().positive().nullable(),
        quantity: z.number().int().min(1).max(9999),
        unitPriceAtSale: z.number().int().min(0).max(100_000_000),
        customDescription: z.string().trim().max(300).nullable(),
      }),
    )
    .min(1)
    .max(100),
  payment: z
    .object({
      amount: z.number().int().min(0).max(100_000_000),
      type: z.enum(['deposit', 'balance', 'full']),
      enteredAsPercentage: z.number().int().min(1).max(100).nullable(),
    })
    .nullable(),
})
.refine(
  (payload) =>
    payload.items.every(
      (item) => item.productVariantId !== null || (item.customDescription ?? '').trim().length > 0,
    ),
  { message: 'Custom item requires a description' },
)

export const PRODUCT_SCHEMA = z.object({
  name: z.string().trim().min(1).max(200),
  categoryId: z.number().int().positive().nullable(),
  supplierId: z.number().int().positive().nullable(),
  imagePath: z.string().trim().max(500).nullable().optional(),
  variants: z
    .array(
      z.object({
        dimension: z.string().trim().max(50),
        name: z.string().trim().max(100).nullable().optional(),
        price: z.number().int().min(0).max(100_000_000),
        sku: z.string().trim().max(100).nullable(),
        initialStock: z.number().int().min(0).max(1_000_000),
        lowStockThreshold: z.number().int().min(0).max(1_000_000),
      }),
    )
    .min(1)
    .max(100),
}).refine(
  (payload) => payload.variants.every((v) => v.dimension.trim().length > 0 || (v.name ?? '').trim().length > 0),
  { message: 'Variant requires a name or a dimension' },
)

export const UPDATE_PRODUCT_SCHEMA = z
  .object({
    id: z.number().int().positive(),
    name: z.string().trim().min(1).max(200),
    categoryId: z.number().int().positive().nullable(),
    supplierId: z.number().int().positive().nullable(),
    imagePath: z.string().trim().max(500).nullable().optional(),
    variants: z
      .array(
        z.object({
          id: z.number().int().positive().optional(),
          dimension: z.string().trim().max(50),
          name: z.string().trim().max(100).nullable().optional(),
          price: z.number().int().min(0).max(100_000_000),
          sku: z.string().trim().max(100).nullable(),
        }),
      )
      .min(1)
      .max(100),
  })
  .refine(
    (payload) => payload.variants.every((v) => v.dimension.trim().length > 0 || (v.name ?? '').trim().length > 0),
    { message: 'Variant requires a name or a dimension' },
  )

export const SETTINGS_SCHEMA = z.object({
  storeName: z.string().trim().min(1).max(200),
  defaultDepositPercentages: z
    .array(z.number().int().min(1).max(100))
    .min(0)
    .max(10)
    .refine((values) => new Set(values).size === values.length, { message: 'Duplicate percentages' }),
  showDeliveryNote: z.boolean(),
  showPhoneOnReceipt: z.boolean(),
  showQuantityOnReceipt: z.boolean(),
  dimensionPresets: z
    .array(z.string().trim().min(1).max(30))
    .min(0)
    .max(20)
    .refine((values) => new Set(values).size === values.length, { message: 'Duplicate presets' }),
})

const PAYMENT_SCHEMA = z.object({
  saleId: z.number().int().positive(),
  amount: z.number().int().min(0).max(100_000_000),
  type: z.enum(['deposit', 'balance', 'full']),
  enteredAsPercentage: z.number().int().min(1).max(100).nullable(),
})

let auth: AuthService
let db: Database

export function registerIpcHandlers(database: Database, authService: AuthService): void {
  db = database
  auth = authService

  ipcMain.handle('auth:status', wrap(async () => ({ needsSetup: auth.needsSetup(), session: auth.getSession() })))

  ipcMain.handle('auth:setupOwner', wrap(async ({ payload }) => auth.setupOwner(payload)))

  ipcMain.handle('auth:login', wrap(async ({ payload }) => {
    const { username, password } = payload as { username: string; password: string }
    return auth.login(username, password)
  }))

  ipcMain.handle('auth:logout', wrap(async () => {
    auth.logout()
  }))

  ipcMain.handle('auth:recoverOwner', wrap(async ({ payload }) => auth.recoverOwner(payload)))

  ipcMain.handle('products:list', wrap(async () => {
    requireSession(auth)
    return listCounterProducts(db)
  }))

  ipcMain.handle('products:topSellers', wrap(async () => {
    requireSession(auth)
    return listTopSellers(db, 6)
  }))

  ipcMain.handle('products:listFull', wrap(async () => {
    requireOwner(auth)
    return listProducts(db)
  }))

  ipcMain.handle('products:create', wrap(async ({ payload }) => {
    requireOwner(auth)
    const parsed = PRODUCT_SCHEMA.safeParse(payload)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    return createProduct(db, parsed.data)
  }))

  ipcMain.handle('products:deactivate', wrap(async ({ payload }) => {
    requireOwner(auth)
    const id = z.number().int().positive().parse(payload)
    deactivateProduct(db, id)
  }))

  ipcMain.handle('products:update', wrap(async ({ payload }) => {
    requireOwner(auth)
    const parsed = UPDATE_PRODUCT_SCHEMA.safeParse(payload)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    updateProduct(db, parsed.data)
  }))

  ipcMain.handle('products:uploadImage', wrap(async () => {
    requireOwner(auth)
    const result = await dialog.showOpenDialog({
      title: 'Choisir la photo du produit',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    const source = result.filePaths[0]
    const ext = path.extname(source).toLowerCase()
    const productsDir = path.join(app.getPath('userData'), 'products')
    fs.mkdirSync(productsDir, { recursive: true })
    const target = path.join(productsDir, `product-${Date.now()}${ext}`)
    fs.copyFileSync(source, target)
    return target
  }))

  ipcMain.handle('suppliers:list', wrap(async () => {
    requireOwner(auth)
    return listSuppliers(db)
  }))

  ipcMain.handle('suppliers:create', wrap(async ({ payload }) => {
    requireOwner(auth)
    const parsed = z.object({ name: z.string().trim().min(1).max(200), phone: z.string().trim().max(30).nullable() }).safeParse(payload)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    return createSupplier(db, parsed.data)
  }))

  ipcMain.handle('suppliers:setActive', wrap(async ({ payload }) => {
    requireOwner(auth)
    const parsed = z.object({ id: z.number().int().positive(), active: z.boolean() }).safeParse(payload)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    setSupplierActive(db, parsed.data.id, parsed.data.active)
  }))

  ipcMain.handle('categories:list', wrap(async () => {
    requireSession(auth)
    return listActiveCategories(db)
  }))

  ipcMain.handle('stock:restock', wrap(async ({ payload }) => {
    const session = requireOwner(auth)
    const parsed = z
      .object({ productVariantId: z.number().int().positive(), quantity: z.number().int().min(1).max(1_000_000) })
      .safeParse(payload)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    restock(db, { productVariantId: parsed.data.productVariantId, quantity: parsed.data.quantity, createdBy: session.userId })
  }))

  ipcMain.handle('stock:adjust', wrap(async ({ payload }) => {
    const session = requireOwner(auth)
    const parsed = z
      .object({
        productVariantId: z.number().int().positive(),
        change: z.number().int().min(-1_000_000).max(1_000_000).refine((v) => v !== 0, { message: 'Change cannot be zero' }),
        reason: z.string().trim().min(1).max(300),
      })
      .safeParse(payload)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    adjustStock(db, { productVariantId: parsed.data.productVariantId, change: parsed.data.change, createdBy: session.userId })
  }))

  ipcMain.handle('stock:movements', wrap(async ({ payload }) => {
    requireOwner(auth)
    const productVariantId = z.number().int().positive().parse(payload)
    return listMovementsForVariant(db, productVariantId)
  }))

  ipcMain.handle('sales:create', wrap(async ({ payload }) => {
    requireSession(auth)
    const parsed = SALE_SCHEMA.safeParse(payload)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    const session = requireSession(auth)
    return createSale(db, { payload: parsed.data, createdBy: session.userId })
  }))

  ipcMain.handle('sales:get', wrap(async ({ payload }) => {
    requireSession(auth)
    return getSale(db, z.number().int().positive().parse(payload))
  }))

  ipcMain.handle('sales:recent', wrap(async ({ payload }) => {
    requireSession(auth)
    return listRecentSales(db, z.number().int().min(1).max(200).default(20).parse(payload))
  }))

  ipcMain.handle('sales:list', wrap(async ({ payload }) => {
    requireSession(auth)
    const parsed = z
      .object({ status: z.enum(['ordered', 'delivered', 'cancelled']).optional() })
      .safeParse(payload ?? {})
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    return listSales(db, { status: parsed.data.status })
  }))

  ipcMain.handle('sales:addPayment', wrap(async ({ payload }) => {
    requireSession(auth)
    const parsed = PAYMENT_SCHEMA.safeParse(payload)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    addPayment(db, parsed.data)
  }))

  ipcMain.handle('sales:setStatus', wrap(async ({ payload }) => {
    requireSession(auth)
    const parsed = z.object({ saleId: z.number().int().positive(), status: z.enum(['ordered', 'delivered', 'cancelled']) }).safeParse(payload)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    setSaleStatus(db, parsed.data.saleId, parsed.data.status)
  }))

  ipcMain.handle('sales:cancel', wrap(async ({ payload }) => {
    requireSession(auth)
    const saleId = z.number().int().positive().parse(payload)
    const session = requireSession(auth)
    cancelSale(db, { saleId, createdBy: session.userId })
  }))

  ipcMain.handle('printing:printReceipt', wrap(async ({ payload }) => {
    requireSession(auth)
    const saleId = z.number().int().positive().parse(payload)
    return printReceipt(db, saleId)
  }))

  ipcMain.handle('printing:printInBrowser', wrap(async ({ payload }) => {
    requireSession(auth)
    const saleId = z.number().int().positive().parse(payload)
    return printInBrowser(receiptHtmlForSale(db, saleId), `Ticket ${saleId}`)
  }))

  ipcMain.handle('printing:printReport', wrap(async ({ payload }) => {
    requireOwner(auth)
    const parsed = z.object({ range: z.object({ from: z.string().min(1), to: z.string().min(1) }), rangeLabel: z.string().min(1) }).safeParse(payload)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    return printReport(db, parsed.data.range, parsed.data.rangeLabel)
  }))

  ipcMain.handle('printing:printReportInBrowser', wrap(async ({ payload }) => {
    requireOwner(auth)
    const parsed = z.object({ range: z.object({ from: z.string().min(1), to: z.string().min(1) }), rangeLabel: z.string().min(1) }).safeParse(payload)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    return printReportInBrowser(db, parsed.data.range, parsed.data.rangeLabel)
  }))

  ipcMain.handle('files:saveCsv', wrap(async ({ payload }) => {
    requireOwner(auth)
    const parsed = z.object({ defaultName: z.string().trim().min(1).max(200), content: z.string().min(1).max(10_000_000) }).safeParse(payload)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    const result = await dialog.showSaveDialog({
      title: 'Exporter CSV',
      defaultPath: parsed.data.defaultName,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (result.canceled || !result.filePath) {
      return null
    }
    fs.writeFileSync(result.filePath, parsed.data.content, 'utf8')
    return result.filePath
  }))

  ipcMain.handle('settings:get', wrap(async () => {
    requireSession(auth)
    return getReceiptSettings(db)
  }))

  ipcMain.handle('settings:updateReceipt', wrap(async ({ payload }) => {
    requireOwner(auth)
    const parsed = SETTINGS_SCHEMA.safeParse(payload)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    updateReceiptSettings(db, {
      storeName: parsed.data.storeName,
      defaultDepositPercentages: parsed.data.defaultDepositPercentages,
      showDeliveryNote: parsed.data.showDeliveryNote,
      showPhoneOnReceipt: parsed.data.showPhoneOnReceipt,
      showQuantityOnReceipt: parsed.data.showQuantityOnReceipt,
      dimensionPresets: parsed.data.dimensionPresets,
      logoPath: getReceiptSettings(db).logo_path,
    })
  }))

  ipcMain.handle('settings:uploadLogo', wrap(async () => {
    requireOwner(auth)
    const result = await dialog.showOpenDialog({
      title: 'Choisir le logo',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    const source = result.filePaths[0]
    const ext = path.extname(source).toLowerCase()
    const logosDir = path.join(app.getPath('userData'), 'logos')
    fs.mkdirSync(logosDir, { recursive: true })
    const target = path.join(logosDir, `logo${ext}`)
    fs.copyFileSync(source, target)
    const current = getReceiptSettings(db)
    updateReceiptSettings(db, {
      storeName: current.store_name,
      defaultDepositPercentages: current.default_deposit_percentages,
      showDeliveryNote: current.show_delivery_note,
      showPhoneOnReceipt: current.show_phone_on_receipt,
      showQuantityOnReceipt: current.show_quantity_on_receipt,
      dimensionPresets: current.dimension_presets,
      logoPath: target,
    })
    return target
  }))

  ipcMain.handle('reports:summary', wrap(async ({ payload }) => {
    requireOwner(auth)
    const parsed = z
      .object({ from: z.string().min(1), to: z.string().min(1) })
      .safeParse(payload ?? {})
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    return reportSummary(db, parsed.data)
  }))

  ipcMain.handle('reports:sales', wrap(async ({ payload }) => {
    requireOwner(auth)
    const parsed = z
      .object({ from: z.string().min(1), to: z.string().min(1) })
      .safeParse(payload ?? {})
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    const rows = db
      .prepare(
        `SELECT id FROM sales
         WHERE created_at >= ? AND created_at < ? AND status != 'cancelled'
         ORDER BY created_at DESC`,
      )
      .all(parsed.data.from, parsed.data.to) as { id: number }[]
    return rows.map((r) => getSale(db, r.id))
  }))

  ipcMain.handle('users:list', wrap(async () => {
    requireOwner(auth)
    return listUsers(db)
  }))

  ipcMain.handle('users:create', wrap(async ({ payload }) => {
    requireOwner(auth)
    const parsed = z
      .object({
        username: z.string().trim().min(2).max(50),
        password: z.string().min(4).max(200),
      })
      .safeParse(payload ?? {})
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    const passwordHash = await hashPassword(parsed.data.password)
    const newId = createUser(db, { username: parsed.data.username, passwordHash, role: 'employee' })
    return findUserById(db, newId)!
  }))

  ipcMain.handle('users:resetPassword', wrap(async ({ payload }) => {
    requireOwner(auth)
    const parsed = z
      .object({ id: z.number().int().positive(), password: z.string().min(4).max(200) })
      .safeParse(payload ?? {})
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    const passwordHash = await hashPassword(parsed.data.password)
    updateUserPassword(db, parsed.data.id, passwordHash)
  }))

  ipcMain.handle('users:setActive', wrap(async ({ payload }) => {
    requireOwner(auth)
    const parsed = z
      .object({ id: z.number().int().positive(), active: z.boolean() })
      .safeParse(payload ?? {})
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    if (!parsed.data.active) {
      const outcome = assertCanDeactivateUser(db, parsed.data.id, auth.getSession()!.userId)
      if (!outcome.ok) {
        throw new AppError('VALIDATION_ERROR', `CANNOT_DEACTIVATE:${outcome.reason}`)
      }
    }
    setUserActive(db, parsed.data.id, parsed.data.active)
  }))
}
