import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Loader2, Minus, Plus, Printer, Ruler, ShoppingCart, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { depositFromPercentage, formatDzd, saleTotal } from '@shared/money'
import { variantLabel } from '@shared/variants'
import type { CounterProduct, NewSalePayload, SaleWithDetails, Session } from '@shared/types'
import { api } from '@/lib/ipc-client'
import { saleReceiptHtml } from '@/lib/receipt-preview'
import { useIsNarrow } from '@/hooks/use-narrow'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PrintPreviewDialog } from '@/components/print-preview-dialog'
import { PageHeader } from '@/components/management/page-header'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface CartLine {
  key: string
  productVariantId: number | null
  name: string
  detail: string
  quantity: number
  unitPrice: number
}

type PaymentSelection =
  | { kind: 'full' }
  | { kind: 'preset'; pct: number }
  | { kind: 'custom'; pct: number | null; amount: number | null }

export function CounterPage({ session }: { session: Session }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isNarrow = useIsNarrow()

  const { data: products = [] } = useQuery({
    queryKey: ['counter-products'],
    queryFn: () => api.products.list(),
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  })
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
  })

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all')
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [payment, setPayment] = useState<PaymentSelection | null>(null)
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const [customDimension, setCustomDimension] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [customPaymentOpen, setCustomPaymentOpen] = useState(false)
  const [customPaymentMode, setCustomPaymentMode] = useState<'percent' | 'amount'>('percent')
  const [customPaymentValue, setCustomPaymentValue] = useState('')
  const [previewSale, setPreviewSale] = useState<SaleWithDetails | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)
  const [cartSheetOpen, setCartSheetOpen] = useState(false)

  const total = useMemo(() => saleTotal(cart), [cart])
  const deposit = useMemo(() => {
    if (!payment) return 0
    if (payment.kind === 'full') return total
    if (payment.kind === 'preset') return depositFromPercentage(total, payment.pct)
    if (payment.kind === 'custom') {
      if (payment.amount != null) return Math.min(payment.amount, total)
      if (payment.pct != null) return depositFromPercentage(total, payment.pct)
    }
    return 0
  }, [payment, total])
  const depositPct = useMemo(() => {
    if (total === 0) return null
    if (payment?.kind === 'preset') return payment.pct
    if (payment?.kind === 'custom' && payment.pct != null) return payment.pct
    return null
  }, [payment, total])
  const remaining = total - deposit

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((p) => {
      if (activeCategory !== 'all' && p.category_id !== activeCategory) return false
      if (!query) return true
      if (p.name.toLowerCase().includes(query)) return true
      return p.variants.some((v) => v.dimension.toLowerCase().includes(query))
    })
  }, [products, search, activeCategory])

  const addToCart = (line: Omit<CartLine, 'quantity'> & { quantity?: number }) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.key === line.key)
      if (existing) {
        return prev.map((l) => (l.key === line.key ? { ...l, quantity: l.quantity + 1 } : l))
      }
      return [...prev, { ...line, key: line.key, quantity: line.quantity ?? 1 }]
    })
  }

  const setQuantity = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l))
        .filter((l) => l.quantity > 0),
    )
  }

  const removeLine = (key: string) => setCart((prev) => prev.filter((l) => l.key !== key))

  const saleMutation = useMutation({
    mutationFn: async () => {
      const items: NewSalePayload['items'] = cart.map((l) => ({
        productVariantId: l.productVariantId,
        quantity: l.quantity,
        unitPriceAtSale: l.productVariantId !== null ? 0 : l.unitPrice,
        customDescription: l.productVariantId !== null ? null : l.detail,
      }))
      const payload: NewSalePayload = {
        customerName: customerName.trim() || 'Client',
        customerPhone: customerPhone.trim() || null,
        wilaya: null,
        deliveryAddress: null,
        items,
        payment:
          deposit > 0
            ? {
                amount: deposit,
                type: deposit === total ? 'full' : 'deposit',
                enteredAsPercentage: depositPct,
              }
            : null,
      }
      const saleId = await api.sales.create(payload)
      const sale = await api.sales.get(saleId)
      setPreviewSale(sale)
      setPreviewOpen(true)
      setPrintError(null)
      return sale
    },
    onError: (error: Error & { code?: string }) => {
      toast.error(error.message ?? t('counter.printFailed'))
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['counter-products'] })
    },
  })

  const printMutation = useMutation({
    mutationFn: async (saleId: number) => {
      const result = await api.printing.printReceipt(saleId)
      if (!result.success) {
        throw new Error(t('counter.printFailedHint'))
      }
      return result
    },
    onSuccess: () => {
      setPrintError(null)
      toast.success(t('counter.saleSaved'))
    },
    onError: (error: Error) => {
      setPrintError(error.message)
    },
  })

  const browserPrintMutation = useMutation({
    mutationFn: async (saleId: number) => {
      const result = await api.printing.printInBrowser(saleId)
      if (!result.success) {
        throw new Error(t('counter.printFailedHint'))
      }
      return result
    },
    onError: (error: Error) => {
      setPrintError(error.message)
    },
  })

  const finishSale = () => {
    setPreviewSale(null)
    setPreviewOpen(false)
    setPrintError(null)
    setCart([])
    setCustomerName('')
    setCustomerPhone('')
    setPayment(null)
    setExpandedProduct(null)
  }

  const addCustomItem = () => {
    const price = Number(customPrice)
    if (!customDimension.trim() || !Number.isFinite(price) || price <= 0) {
      toast.error(t('counter.invalidPrice'))
      return
    }
    const description = `Dimension Personnalisée: ${customDimension.trim()}`
    addToCart({
      key: `custom:${customDimension.trim()}`,
      productVariantId: null,
      name: t('counter.customDimension'),
      detail: description,
      unitPrice: price,
    })
    setCustomDialogOpen(false)
    setCustomDimension('')
    setCustomPrice('')
  }

  const applyCustomPayment = () => {
    const value = Number(customPaymentValue)
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(t('counter.invalidPrice'))
      return
    }
    setPayment({
      kind: 'custom',
      pct: customPaymentMode === 'percent' ? Math.min(100, value) : null,
      amount: customPaymentMode === 'amount' ? value : null,
    })
    setCustomPaymentOpen(false)
    setCustomPaymentValue('')
  }

  const depositLabel = useMemo(() => {
    if (payment?.kind === 'full') return t('counter.payFull')
    if (payment?.kind === 'preset') return t('counter.depositOf', { pct: payment.pct })
    if (payment?.kind === 'custom') {
      if (payment.pct != null) return t('counter.depositOf', { pct: payment.pct })
      return t('counter.customPayment')
    }
    return null
  }, [payment, t])

  const saleIsValid = cart.length > 0 && !saleMutation.isPending && previewSale === null

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title={t('counter.title')} />
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex gap-2">
            <Input
              className="flex-1"
              placeholder={t('counter.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" onClick={() => setCustomDialogOpen(true)}>
              <Ruler />
              {t('counter.customDimension')}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={activeCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setActiveCategory('all')}
            >
              {t('counter.allCategories')}
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                size="sm"
                variant={activeCategory === category.id ? 'default' : 'outline'}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-3 gap-3 overflow-auto pe-1 xl:grid-cols-4">
            {filteredProducts.length === 0 && (
              <div className="col-span-full flex flex-col items-center gap-2 py-16 text-center">
                <ShoppingCart className="size-10 text-muted-foreground" />
                <p className="font-semibold">{t('counter.noProducts')}</p>
                <p className="text-sm text-muted-foreground">
                  {session.role === 'owner' ? t('counter.noProductsOwner') : t('counter.noProductsEmployee')}
                </p>
              </div>
            )}
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                expanded={expandedProduct === product.id}
                onToggle={() => setExpandedProduct((cur) => (cur === product.id ? null : product.id))}
                onSelectVariant={(variantId, dimension, price, outOfStock) => {
                  addToCart({
                    key: `variant:${variantId}`,
                    productVariantId: variantId,
                    name: product.name,
                    detail: dimension,
                    unitPrice: price,
                  })
                  if (outOfStock) {
                    toast.warning(t('counter.zeroStock'))
                  }
                }}
                onCustom={() => setCustomDialogOpen(true)}
                fromLabel={t('counter.from')}
                customDimensionLabel={t('counter.customDimension')}
                zeroStockLabel={t('counter.zeroStock')}
              />
            ))}
          </div>
        </div>

        {isNarrow ? null : (
          <div className="flex w-[360px] shrink-0 flex-col gap-3">
            <CheckoutPanel
              cart={cart}
              onSetQuantity={setQuantity}
              onRemoveLine={removeLine}
              customerName={customerName}
              onCustomerName={setCustomerName}
              customerPhone={customerPhone}
              onCustomerPhone={setCustomerPhone}
              payment={payment}
              onPayment={setPayment}
              onCustomPayment={() => setCustomPaymentOpen(true)}
              depositPresets={settings?.default_deposit_percentages ?? []}
              total={total}
              deposit={deposit}
              remaining={remaining}
              depositLabel={depositLabel}
              saleIsValid={saleIsValid}
              saving={saleMutation.isPending}
              onSave={() => saleMutation.mutate()}
            />
          </div>
        )}
      </div>

      {isNarrow && (
        <div className="sticky bottom-0 z-20 -mx-4 border-t bg-card p-3 md:-mx-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{cart.reduce((sum, l) => sum + l.quantity, 0)}</Badge>
              <span className="text-lg font-bold" dir="ltr">
                {formatDzd(total)}
              </span>
            </div>
            <Button onClick={() => setCartSheetOpen(true)} disabled={cart.length === 0}>
              <ShoppingCart />
              {t('counter.viewCart')}
            </Button>
          </div>
        </div>
      )}

      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-background p-4 sm:max-w-md">
          <SheetHeader className="mb-3">
            <SheetTitle>{t('counter.cart')}</SheetTitle>
          </SheetHeader>
          <CheckoutPanel
            cart={cart}
            onSetQuantity={setQuantity}
            onRemoveLine={removeLine}
            customerName={customerName}
            onCustomerName={setCustomerName}
            customerPhone={customerPhone}
            onCustomerPhone={setCustomerPhone}
            payment={payment}
            onPayment={setPayment}
            onCustomPayment={() => setCustomPaymentOpen(true)}
            depositPresets={settings?.default_deposit_percentages ?? []}
            total={total}
            deposit={deposit}
            remaining={remaining}
            depositLabel={depositLabel}
            saleIsValid={saleIsValid}
            saving={saleMutation.isPending}
            onSave={() => {
              saleMutation.mutate()
              setCartSheetOpen(false)
            }}
          />
        </SheetContent>
      </Sheet>

      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('counter.customDimensionTitle')}</DialogTitle>
            <DialogDescription>{t('counter.customDimension')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="custom-dimension">{t('counter.dimensionLabel')}</Label>
              <Input
                id="custom-dimension"
                dir="auto"
                placeholder={t('counter.dimensionPlaceholder')}
                value={customDimension}
                onChange={(e) => setCustomDimension(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-price">{t('counter.priceLabel')}</Label>
              <Input
                id="custom-price"
                dir="ltr"
                inputMode="numeric"
                placeholder={t('counter.pricePlaceholder')}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={addCustomItem}>
              {t('counter.add')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={customPaymentOpen} onOpenChange={setCustomPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('counter.customPaymentTitle')}</DialogTitle>
            <DialogDescription>{t('counter.customPayment')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={customPaymentMode === 'percent' ? 'default' : 'outline'}
                onClick={() => setCustomPaymentMode('percent')}
              >
                {t('counter.percent')}
              </Button>
              <Button
                size="sm"
                variant={customPaymentMode === 'amount' ? 'default' : 'outline'}
                onClick={() => setCustomPaymentMode('amount')}
              >
                {t('counter.amount')}
              </Button>
            </div>
            <Input
              dir="ltr"
              inputMode="numeric"
              value={customPaymentValue}
              onChange={(e) => setCustomPaymentValue(e.target.value)}
              placeholder={customPaymentMode === 'percent' ? '%' : 'DZD'}
            />
            <Button className="w-full" onClick={applyCustomPayment}>
              {t('counter.add')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {previewSale && settings && (
        <PrintPreviewDialog
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open)
            if (!open) {
              setPrintError(null)
            }
          }}
          title={`${t('counter.saleSaved')} — ${previewSale.customer_name ?? ''}`}
          html={saleReceiptHtml(previewSale, settings)}
          onPrint={() => printMutation.mutateAsync(previewSale.id)}
          printing={printMutation.isPending}
          printError={printError}
          finishLabel={t('counter.finish')}
          onFinish={finishSale}
          browserPrintLabel={t('counter.printBrowser')}
          onBrowserPrint={() => browserPrintMutation.mutateAsync(previewSale.id)}
          browserPrinting={browserPrintMutation.isPending}
        />
      )}
      {previewSale && !previewOpen && (
        <div className="flex flex-wrap items-center gap-2 rounded-none border border-primary/30 bg-primary/5 p-3 text-sm">
          <span className="font-semibold text-primary">{t('counter.saleSaved')}</span>
          <span className="text-muted-foreground">N° {String(previewSale.id).padStart(4, '0')}</span>
          <div className="ms-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Printer className="size-4" />
              {t('counter.reopenPreview')}
            </Button>
            <Button size="sm" onClick={finishSale}>
              {t('counter.finish')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckoutPanel({
  cart,
  onSetQuantity,
  onRemoveLine,
  customerName,
  onCustomerName,
  customerPhone,
  onCustomerPhone,
  payment,
  onPayment,
  onCustomPayment,
  depositPresets,
  total,
  deposit,
  remaining,
  depositLabel,
  saleIsValid,
  saving,
  onSave,
}: {
  cart: CartLine[]
  onSetQuantity: (key: string, delta: number) => void
  onRemoveLine: (key: string) => void
  customerName: string
  onCustomerName: (value: string) => void
  customerPhone: string
  onCustomerPhone: (value: string) => void
  payment: PaymentSelection | null
  onPayment: (payment: PaymentSelection | null) => void
  onCustomPayment: () => void
  depositPresets: number[]
  total: number
  deposit: number
  remaining: number
  depositLabel: string | null
  saleIsValid: boolean
  saving: boolean
  onSave: () => void
}) {
  const { t } = useTranslation()

  return (
    <>
      <Card className="flex min-h-0 flex-1 flex-col p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">{t('counter.cart')}</h2>
          <Badge variant="secondary">{cart.reduce((sum, l) => sum + l.quantity, 0)}</Badge>
        </div>
        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <ShoppingCart className="size-10" />
            <p className="font-semibold text-foreground">{t('counter.cartEmpty')}</p>
            <p className="text-sm">{t('counter.cartEmptyHint')}</p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-3 overflow-auto">
            {cart.map((line) => (
              <div key={line.key} className="rounded-none border p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" dir="auto">
                      {line.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground" dir="auto">
                      {line.detail}
                    </p>
                  </div>
                  {line.productVariantId === null && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {t('counter.customTag')}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={() => onRemoveLine(line.key)}
                    aria-label={t('common.cancel')}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="size-6" onClick={() => onSetQuantity(line.key, -1)}>
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center text-sm" dir="ltr">
                      {line.quantity}
                    </span>
                    <Button variant="outline" size="icon" className="size-6" onClick={() => onSetQuantity(line.key, 1)}>
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-semibold" dir="ltr">
                    {formatDzd(line.quantity * line.unitPrice)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <div className="space-y-2">
          <Label htmlFor="counter-customer">{t('counter.customerName')}</Label>
          <Input
            id="counter-customer"
            dir="auto"
            placeholder={t('counter.customerNamePlaceholder')}
            value={customerName}
            onChange={(e) => onCustomerName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="counter-phone">{t('counter.customerPhone')}</Label>
          <Input
            id="counter-phone"
            dir="ltr"
            inputMode="tel"
            placeholder={t('counter.customerPhonePlaceholder')}
            value={customerPhone}
            onChange={(e) => onCustomerPhone(e.target.value)}
          />
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="font-bold">{t('counter.payment')}</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={payment?.kind === 'full' ? 'default' : 'outline'}
            onClick={() => onPayment(payment?.kind === 'full' ? null : { kind: 'full' })}
          >
            {t('counter.payFull')}
          </Button>
          {depositPresets.map((pct) => (
            <Button
              key={pct}
              size="sm"
              variant={payment?.kind === 'preset' && payment.pct === pct ? 'default' : 'outline'}
              onClick={() =>
                onPayment(payment?.kind === 'preset' && payment.pct === pct ? null : { kind: 'preset', pct })
              }
            >
              {t('counter.depositOf', { pct })}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={onCustomPayment}>
            {t('counter.customPayment')}
          </Button>
        </div>
        <Separator />
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('counter.total')}</span>
            <span className="font-semibold" dir="ltr">
              {formatDzd(total)}
            </span>
          </div>
          {deposit > 0 && (
            <div className="flex justify-between text-primary">
              <span>{depositLabel}</span>
              <span dir="ltr">{formatDzd(deposit)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>{t('counter.remaining') ?? t('counter.total')}</span>
            <span dir="ltr">{formatDzd(remaining)}</span>
          </div>
        </div>
        <Button
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          size="lg"
          disabled={!saleIsValid}
          onClick={onSave}
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {t('counter.save')}
        </Button>
      </Card>
    </>
  )
}

function ProductCard({
  product,
  expanded,
  onToggle,
  onSelectVariant,
  onCustom,
  fromLabel,
  customDimensionLabel,
  zeroStockLabel,
}: {
  product: CounterProduct
  expanded: boolean
  onToggle: () => void
  onSelectVariant: (variantId: number, dimension: string, price: number, outOfStock: boolean) => void
  onCustom: () => void
  fromLabel: string
  customDimensionLabel: string
  zeroStockLabel: string
}) {
  const minPrice = product.variants.length > 0 ? Math.min(...product.variants.map((v) => v.price)) : 0
  return (
    <div className={expanded ? 'rounded-md border-2 border-primary p-2' : 'rounded-md border p-2'}>
      <button type="button" onClick={onToggle} className="w-full text-start">
        <div className="flex h-16 items-center justify-center rounded-md bg-muted text-2xl font-bold text-muted-foreground">
          {product.name.charAt(0).toUpperCase()}
        </div>
        <p className="mt-2 truncate text-sm font-semibold" dir="auto">
          {product.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {product.variants.length} · {fromLabel} <span dir="ltr">{formatDzd(minPrice)}</span>
        </p>
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                className="relative rounded-md border p-2 text-center transition-colors hover:border-primary hover:bg-primary/5"
                onClick={() => onSelectVariant(variant.id, variant.dimension, variant.price, variant.out_of_stock)}
              >
                <span className="block text-sm font-semibold" dir="auto">
                  {variantLabel(variant.name, variant.dimension)}
                </span>
                <span className="block text-xs text-muted-foreground" dir="ltr">
                  {formatDzd(variant.price)}
                </span>
                {variant.out_of_stock && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-destructive">
                    <AlertTriangle className="size-3" />
                    {zeroStockLabel}
                  </span>
                )}
              </button>
            ))}
          </div>
          <Button variant="outline" className="w-full" onClick={onCustom}>
            <Ruler />
            {customDimensionLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
