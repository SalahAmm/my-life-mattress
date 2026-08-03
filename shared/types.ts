export type Role = 'owner' | 'employee'

export interface Session {
  userId: number
  username: string
  role: Role
}

export type UserRow = {
  id: number
  username: string
  password_hash: string
  role: Role
  recovery_code_hash: string | null
  active: boolean
  created_at: string
}

export type Category = {
  id: number
  name: string
  sort_order: number
  active: boolean
}

export type Supplier = {
  id: number
  name: string
  phone: string | null
  active: boolean
  created_at: string
}

export type Product = {
  id: number
  name: string
  category_id: number | null
  supplier_id: number | null
  image_path: string | null
  active: boolean
  created_at: string
}

export type ProductVariant = {
  id: number
  product_id: number
  dimension: string
  name: string | null
  price: number
  sku: string | null
}

export type StockItem = {
  id: number
  product_variant_id: number
  quantity_on_hand: number
  low_stock_threshold: number
  updated_at: string
}

export type Customer = {
  id: number
  name: string
  phone: string | null
  created_at: string
}

export type SaleStatus = 'ordered' | 'delivered' | 'cancelled'

export type Sale = {
  id: number
  customer_id: number | null
  created_by: number
  status: SaleStatus
  wilaya: string | null
  delivery_address: string | null
  created_at: string
}

export type SaleItem = {
  id: number
  sale_id: number
  product_variant_id: number | null
  quantity: number
  unit_price_at_sale: number
  custom_description: string | null
}

export type PaymentType = 'deposit' | 'balance' | 'full'

export type Payment = {
  id: number
  sale_id: number
  amount: number
  type: PaymentType
  entered_as_percentage: number | null
  created_at: string
}

export type StockMovementReason = 'sale' | 'restock' | 'adjustment'

export type StockMovement = {
  id: number
  stock_item_id: number
  change: number
  reason: StockMovementReason
  reference_id: number | null
  created_at: string
  created_by: number
}

export type ReceiptSettings = {
  id: number
  store_name: string
  logo_path: string | null
  default_deposit_percentages: number[]
  dimension_presets: string[]
  show_delivery_note: boolean
  show_phone_on_receipt: boolean
  show_quantity_on_receipt: boolean
  updated_at: string
}

export type AppErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INSUFFICIENT_STOCK'
  | 'DB_ERROR'
  | 'RECOVERY_CODE_INVALID'
  | 'USERNAME_TAKEN'
  | 'BACKUP_INVALID'

export class AppError extends Error {
  code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }
}

export interface ProductWithVariants {
  id: number
  name: string
  category_id: number | null
  category_name: string | null
  supplier_id: number | null
  supplier_name: string | null
  image_path: string | null
  active: boolean
  variants: ProductVariantWithStock[]
}

export interface ProductVariantWithStock {
  id: number
  product_id: number
  dimension: string
  name: string | null
  price: number
  sku: string | null
  quantity_on_hand: number
  low_stock_threshold: number
  out_of_stock: boolean
}

export interface CounterProduct {
  id: number
  name: string
  category_id: number | null
  image_path: string | null
  variants: {
    id: number
    dimension: string
    name: string | null
    price: number
    out_of_stock: boolean
  }[]
}

export interface NewVariantInput {
  dimension: string
  name?: string | null
  price: number
  sku: string | null
  initialStock: number
  lowStockThreshold: number
}

export interface NewProductInput {
  name: string
  categoryId: number | null
  supplierId: number | null
  imagePath?: string | null
  variants: NewVariantInput[]
}

export interface NewSaleItemPayload {
  productVariantId: number | null
  quantity: number
  unitPriceAtSale: number
  customDescription: string | null
}

export interface NewPaymentPayload {
  amount: number
  type: PaymentType
  enteredAsPercentage: number | null
}

export interface NewSalePayload {
  customerName: string
  customerPhone: string | null
  wilaya: string | null
  deliveryAddress: string | null
  items: NewSaleItemPayload[]
  payment: NewPaymentPayload | null
}

export interface SaleItemDetailed {
  id: number
  sale_id: number
  product_variant_id: number | null
  quantity: number
  unit_price_at_sale: number
  custom_description: string | null
  product_name: string | null
  dimension: string | null
  variant_name: string | null
}

export interface SaleWithDetails {
  id: number
  customer_id: number | null
  customer_name: string | null
  customer_phone: string | null
  created_by: number
  created_by_username: string
  status: SaleStatus
  wilaya: string | null
  delivery_address: string | null
  created_at: string
  items: SaleItemDetailed[]
  payments: Payment[]
  total: number
  paid: number
  remaining: number
}
