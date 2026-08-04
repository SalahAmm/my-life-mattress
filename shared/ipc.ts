import type {
  AppErrorCode,
  Category,
  CounterProduct,
  NewProductInput,
  NewSalePayload,
  PaymentType,
  ProductWithVariants,
  ReceiptSettings,
  SaleStatus,
  SaleWithDetails,
  Session,
  StockMovement,
  Supplier,
  TopSeller,
  UserRow,
} from './types'

export type PublicUser = Omit<UserRow, 'password_hash' | 'recovery_code_hash'>

export interface AuthStatus {
  needsSetup: boolean
  session: Session | null
}

export interface SetupOwnerResult {
  session: Session
  recoveryCode: string
}

export interface UpdateReceiptSettingsInput {
  storeName: string
  defaultDepositPercentages: number[]
  showDeliveryNote: boolean
  showPhoneOnReceipt: boolean
  showQuantityOnReceipt: boolean
  dimensionPresets: string[]
  receiptWidthMm?: number
  receiptHeightMm?: number | null
  receiptFontScale?: number
  employeesSeeDelivered?: boolean
  employeesCanCollectDeliver?: boolean
}

export interface PrintResult {
  success: boolean
  reason?: string
}

export interface ReportRange {
  from: string
  to: string
}

export interface ProductBreakdown {
  label: string
  units: number
  revenue: number
}

export interface ReportSummary {
  revenue: number
  depositsCollected: number
  outstanding: number
  salesCount: number
  perProduct: ProductBreakdown[]
}

export interface UpdateProductInput {
  id: number
  name: string
  categoryId: number | null
  supplierId: number | null
  imagePath?: string | null
  variants: {
    id?: number
    dimension: string
    name?: string | null
    price: number
    sku: string | null
  }[]
}

export interface ElectronAPI {
  auth: {
    status(): Promise<AuthStatus>
    setupOwner(input: { username: string; password: string }): Promise<SetupOwnerResult>
    login(username: string, password: string): Promise<Session>
    logout(): Promise<void>
    recoverOwner(input: { code: string; newPassword: string }): Promise<Session>
  }
  products: {
    list(): Promise<CounterProduct[]>
    listFull(): Promise<ProductWithVariants[]>
    topSellers(): Promise<TopSeller[]>
    create(input: NewProductInput): Promise<number>
    update(input: UpdateProductInput): Promise<void>
    deactivate(id: number): Promise<void>
    uploadImage(): Promise<string | null>
  }
  suppliers: {
    list(): Promise<Supplier[]>
    create(input: { name: string; phone: string | null }): Promise<number>
    setActive(input: { id: number; active: boolean }): Promise<void>
  }
  categories: {
    list(): Promise<Category[]>
    listAll(): Promise<Category[]>
    create(input: { name: string }): Promise<number>
    rename(input: { id: number; name: string }): Promise<void>
    setActive(input: { id: number; active: boolean }): Promise<void>
  }
  stock: {
    restock(input: { productVariantId: number; quantity: number }): Promise<void>
    adjust(input: { productVariantId: number; change: number; reason: string }): Promise<void>
    movements(productVariantId: number): Promise<StockMovement[]>
  }
  sales: {
    create(payload: NewSalePayload): Promise<number>
    get(id: number): Promise<SaleWithDetails>
    recent(limit: number): Promise<SaleWithDetails[]>
    list(input: { status?: SaleStatus }): Promise<SaleWithDetails[]>
    addPayment(input: {
      saleId: number
      amount: number
      type: PaymentType
      enteredAsPercentage: number | null
    }): Promise<void>
    setStatus(input: { saleId: number; status: SaleStatus }): Promise<void>
    cancel(input: { saleId: number }): Promise<void>
    delete(saleId: number): Promise<void>
    clearDelivered(): Promise<number>
  }
  printing: {
    printReceipt(saleId: number): Promise<PrintResult>
    testPrint(): Promise<PrintResult>
    printReport(range: ReportRange, rangeLabel: string): Promise<PrintResult>
  }
  files: {
    saveCsv(input: { defaultName: string; content: string }): Promise<string | null>
    backupDatabase(): Promise<string | null>
    restoreDatabase(): Promise<{ requiresRestart: boolean } | null>
  }
  data: {
    deleteAll(password: string): Promise<void>
  }
  settings: {
    get(): Promise<ReceiptSettings>
    updateReceipt(input: UpdateReceiptSettingsInput): Promise<void>
    uploadLogo(): Promise<string | null>
  }
  reports: {
    summary(range: ReportRange): Promise<ReportSummary>
    sales(range: ReportRange): Promise<SaleWithDetails[]>
  }
  users: {
    list(): Promise<PublicUser[]>
    create(input: { username: string; password: string }): Promise<PublicUser>
    resetPassword(input: { id: number; password: string }): Promise<void>
    setActive(input: { id: number; active: boolean }): Promise<void>
  }
}

export interface IpcErrorPayload {
  code: AppErrorCode
  message: string
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcErrorPayload }
