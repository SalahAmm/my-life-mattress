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
  Supplier,
  TopSeller,
} from './types'

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
}

export interface PrintResult {
  success: boolean
  reason?: string
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
  }
  printing: {
    printReceipt(saleId: number): Promise<PrintResult>
    printInBrowser(saleId: number): Promise<PrintResult>
  }
  settings: {
    get(): Promise<ReceiptSettings>
    updateReceipt(input: UpdateReceiptSettingsInput): Promise<void>
    uploadLogo(): Promise<string | null>
  }
}

export interface IpcErrorPayload {
  code: AppErrorCode
  message: string
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcErrorPayload }
