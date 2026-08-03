import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowLeft, Loader2, Minus, Plus, Ruler, ShoppingCart, Trash2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { depositFromPercentage, formatDzd, saleTotal } from '@shared/money'
import { variantLabel } from '@shared/variants'
import type { CounterProduct, NewSalePayload, SaleWithDetails, Session } from '@shared/types'
import { api } from '@/lib/ipc-client'
import { saleReceiptHtml } from '@/lib/receipt-preview'
import { useIsNarrow } from '@/hooks/use-narrow'
import { productImageUrl } from '@/lib/product-image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PrintPreviewDialog } from '@/components/print-preview-dialog'
import { PageHeader } from '@/components/management/page-header'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { WILAYAS } from '@shared/wilayas'

interface CartLine {
  key: string
  productVariantId: number | null
  name: string
  detail: string
  quantity: number
  unitPrice: number
  lowStock?: boolean
  availableLow?: number | null
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
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [chooserProduct, setChooserProduct] = useState<CounterProduct | null>(null)
  const [chooserName, setChooserName] = useState<string | null>(null)
  const [chooserDimension, setChooserDimension] = useState<string | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [freeDelivery, setFreeDelivery] = useState(false)
  const [wilaya, setWilaya] = useState<string>('none')
  const [customWilaya, setCustomWilaya] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [payment, setPayment] = useState<PaymentSelection | null>(null)
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const [customDimension, setCustomDimension] = useState('')
  const [customName, setCustomName] = useState('')
  const [customNote, setCustomNote] = useState('')
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

  const nearEndLine = useMemo(() => cart.find((l) => l.lowStock), [cart])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((p) => {
      if (activeCategory !== null && p.category_id !== activeCategory) return false
      if (!query) return true
      if (p.name.toLowerCase().includes(query)) return true
      return p.variants.some(
        (v) =>
          v.dimension.toLowerCase().includes(query) ||
          (v.name ?? '').toLowerCase().includes(query),
      )
    })
  }, [products, search, activeCategory])

  const mainView = activeCategory === null && !search.trim()

  const openChooser = (product: CounterProduct) => {
    setChooserProduct(product)
    setChooserName(null)
    setChooserDimension(null)
  }

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
        wilaya: wilaya === 'none' ? null : wilaya === '__custom' ? (customWilaya.trim() || null) : wilaya,
        deliveryAddress: deliveryAddress.trim() || null,
        freeDelivery,
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
    setFreeDelivery(false)
    setWilaya('none')
    setCustomWilaya('')
    setDeliveryAddress('')
    setPayment(null)
  }

  const addCustomItem = () => {
    const price = Number(customPrice)
    if (!customDimension.trim() || !Number.isFinite(price) || price <= 0) {
      toast.error(t('counter.invalidPrice'))
      return
    }
    const parts = [customName.trim(), `Dimension Personnalisée: ${customDimension.trim()}`].filter(Boolean)
    const description = [parts.join(' — '), customNote.trim()].filter(Boolean).join(' · ')
    addToCart({
      key: `custom:${description}`,
      productVariantId: null,
      name: t('counter.customDimension'),
      detail: description,
      unitPrice: price,
    })
    setCustomDialogOpen(false)
    setCustomDimension('')
    setCustomName('')
    setCustomNote('')
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

  const checkoutPanel = (
    <CheckoutPanel
      cart={cart}
      onSetQuantity={setQuantity}
      onRemoveLine={removeLine}
      customerName={customerName}
      onCustomerName={setCustomerName}
      customerPhone={customerPhone}
      onCustomerPhone={setCustomerPhone}
      freeDelivery={freeDelivery}
      onFreeDelivery={setFreeDelivery}
      freeDeliveryEnabled={settings?.show_delivery_note ?? false}
      wilaya={wilaya}
      onWilaya={setWilaya}
      customWilaya={customWilaya}
      onCustomWilaya={setCustomWilaya}
      deliveryAddress={deliveryAddress}
      onDeliveryAddress={setDeliveryAddress}
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
  )

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
          {nearEndLine && (
            <div className="flex items-center gap-2 border border-warning/40 bg-warning/15 px-3 py-2 text-sm font-medium">
              <AlertTriangle className="size-4 shrink-0 text-warning" />
              <span>
                {t('counter.nearEnd')} : {nearEndLine.name} {nearEndLine.detail} —{' '}
                {nearEndLine.availableLow != null ? t('counter.onlyLeft', { n: nearEndLine.availableLow }) : t('counter.rupture')}
              </span>
            </div>
          )}
          {mainView ? (
            <>
              <h2 className="text-sm font-semibold text-muted-foreground">{t('counter.categories')}</h2>
              <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3 overflow-auto pe-1 sm:grid-cols-3 xl:grid-cols-4">
                {categories.map((category) => {
                  const count = products.filter((p) => p.category_id === category.id).length
                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-label={category.name}
                      onClick={() => setActiveCategory(category.id)}
                      className="flex flex-col items-center gap-2 border bg-card p-6 text-center transition-colors hover:bg-muted"
                    >
                      <span className="text-3xl font-bold text-primary">{category.name.charAt(0).toUpperCase()}</span>
                      <span className="font-semibold" dir="auto">
                        {category.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {count} {count > 1 ? t('counter.products') : t('counter.product')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" className="w-fit" onClick={() => setActiveCategory(null)}>
                <ArrowLeft />
                {t('counter.allCategories')}
              </Button>
              {filteredProducts.length === 0 ? (
                <div className="flex flex-1 flex-col items-center gap-2 py-16 text-center">
                  <ShoppingCart className="size-10 text-muted-foreground" />
                  <p className="font-semibold">{t('counter.noProducts')}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.role === 'owner' ? t('counter.noProductsOwner') : t('counter.noProductsEmployee')}
                  </p>
                </div>
              ) : (
                <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3 overflow-auto pe-1 sm:grid-cols-3 xl:grid-cols-4">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onSelect={() => openChooser(product)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {isNarrow ? null : <div className="flex w-[360px] shrink-0 flex-col gap-3">{checkoutPanel}</div>}
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
            freeDelivery={freeDelivery}
            onFreeDelivery={setFreeDelivery}
            freeDeliveryEnabled={settings?.show_delivery_note ?? false}
            wilaya={wilaya}
            onWilaya={setWilaya}
            customWilaya={customWilaya}
            onCustomWilaya={setCustomWilaya}
            deliveryAddress={deliveryAddress}
            onDeliveryAddress={setDeliveryAddress}
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

      <ChooserDialog
        product={chooserProduct}
        selectedName={chooserName}
        selectedDimension={chooserDimension}
        onSelectName={setChooserName}
        onSelectDimension={setChooserDimension}
        onClose={() => setChooserProduct(null)}
        onConfirm={(variant) => {
          if (!chooserProduct) return
          addToCart({
            key: `variant:${variant.id}`,
            productVariantId: variant.id,
            name: chooserProduct.name,
            detail: variantLabel(variant.name, variant.dimension),
            unitPrice: variant.price,
            lowStock: variant.low_stock,
            availableLow: variant.available_low,
          })
          if (variant.out_of_stock) {
            toast.warning(t('counter.zeroStock'))
          }
          setChooserProduct(null)
        }}
      />

      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('counter.customDimensionTitle')}</DialogTitle>
            <DialogDescription>{t('counter.customDimension')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="custom-name">{t('counter.customName')}</Label>
              <Input
                id="custom-name"
                dir="auto"
                placeholder={t('counter.customNamePlaceholder')}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="custom-note">{t('counter.customNote')}</Label>
              <Input
                id="custom-note"
                dir="auto"
                placeholder={t('counter.customNotePlaceholder')}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
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

function availabilityLabel(
  t: (key: string, opts?: { n?: number }) => string,
  variant: { out_of_stock: boolean; low_stock: boolean; available_low: number | null; available_above: number | null },
): string {
  if (variant.out_of_stock) return t('counter.rupture')
  if (variant.low_stock) return t('counter.onlyLeft', { n: variant.available_low ?? 0 })
  return t('counter.moreThan', { n: variant.available_above ?? 3 })
}

function AvailabilityPill({
  variant,
  light,
}: {
  variant: { out_of_stock: boolean; low_stock: boolean; available_low: number | null; available_above: number | null }
  light?: boolean
}) {
  const { t } = useTranslation()
  const className = variant.out_of_stock
    ? 'bg-destructive text-destructive-foreground'
    : variant.low_stock
      ? 'bg-warning text-warning-foreground'
      : 'bg-success text-success-foreground'
  return (
    <span
      data-slot="availability-pill"
      className={cn(
        'inline-block rounded-none px-2 py-0.5 text-xs font-bold whitespace-nowrap',
        className,
        light && 'opacity-90',
      )}
    >
      {availabilityLabel(t, variant)}
    </span>
  )
}

function ChooserDialog({
  product,
  selectedName,
  selectedDimension,
  onSelectName,
  onSelectDimension,
  onClose,
  onConfirm,
}: {
  product: CounterProduct | null
  selectedName: string | null
  selectedDimension: string | null
  onSelectName: (name: string | null) => void
  onSelectDimension: (dimension: string | null) => void
  onClose: () => void
  onConfirm: (variant: CounterProduct['variants'][number]) => void
}) {
  const { t } = useTranslation()
  if (!product) return null

  const names = [...new Set(product.variants.map((v) => v.name).filter(Boolean) as string[])]
  const dimensions = [...new Set(product.variants.map((v) => v.dimension).filter((d) => d.trim()) as string[])]

  const matching = (name: string | null, dimension: string | null) =>
    product.variants.find(
      (v) =>
        (name === null || v.name === name) &&
        (dimension === null || v.dimension === dimension || (dimension === '' && !v.dimension.trim())),
    )

  const nameVariants = (name: string) =>
    product.variants.filter((v) => v.name === name && (selectedDimension === null || v.dimension === selectedDimension))
  const dimensionVariants = (dimension: string) =>
    product.variants.filter((v) => v.dimension === dimension && (selectedName === null || v.name === selectedName))

  const selectedVariant =
    names.length === 0 && dimensions.length === 0
      ? product.variants[0]
      : matching(selectedName, selectedDimension)

  const canConfirm = selectedVariant !== undefined

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle dir="auto">{product.name}</DialogTitle>
          <DialogDescription>{t('counter.availability')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {names.length > 0 && (
            <div className="space-y-2">
              <Label>{t('counter.chooseColor')}</Label>
              <div className="flex flex-wrap gap-2">
                {names.map((name) => {
                  const variants = nameVariants(name)
                  const first = variants[0]
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => onSelectName(selectedName === name ? null : name)}
                      className={cn(
                        'rounded-none border px-3 py-2 text-sm transition-colors',
                        selectedName === name ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-muted',
                      )}
                    >
                      <span className="block" dir="auto">
                        {name}
                      </span>
                      {first && (
                        <span className="mt-1 block">
                          <AvailabilityPill variant={first} light={selectedName === name} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {dimensions.length > 0 && (
            <div className="space-y-2">
              <Label>{t('counter.chooseSize')}</Label>
              <div className="flex flex-wrap gap-2">
                {dimensions.map((dimension) => {
                  const first = dimensionVariants(dimension)[0]
                  return (
                    <button
                      key={dimension}
                      type="button"
                      onClick={() => onSelectDimension(selectedDimension === dimension ? null : dimension)}
                      className={cn(
                        'rounded-none border px-3 py-2 text-sm transition-colors',
                        selectedDimension === dimension ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-muted',
                      )}
                    >
                      <span className="block" dir="auto">
                        {dimension}
                      </span>
                      {first && (
                        <span className="mt-1 block">
                          <AvailabilityPill variant={first} light={selectedDimension === dimension} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {selectedVariant && (
            <div className="flex items-center justify-between gap-2 rounded-none border bg-muted/50 px-3 py-2 text-sm">
              <span className="font-medium" dir="auto">
                {variantLabel(selectedVariant.name, selectedVariant.dimension) || product.name}
              </span>
              <AvailabilityPill variant={selectedVariant} />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('counter.close')}
            </Button>
            <Button disabled={!canConfirm} onClick={() => selectedVariant && onConfirm(selectedVariant)}>
              {t('counter.ok')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProductCard({ product, onSelect }: { product: CounterProduct; onSelect: () => void }) {
  const { t } = useTranslation()
  const minPrice = product.variants.length > 0 ? Math.min(...product.variants.map((v) => v.price)) : 0
  const imageUrl = productImageUrl(product.image_path)
  return (
    <button
      type="button"
      aria-label={product.name}
      onClick={onSelect}
      className="rounded-none border bg-card p-2 text-start transition-colors hover:bg-muted"
    >
      {imageUrl ? (
        <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-none bg-muted">
          <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-none bg-muted text-4xl font-bold text-muted-foreground">
          {product.name.charAt(0).toUpperCase()}
        </div>
      )}
      <p className="mt-2 truncate text-sm font-semibold" dir="auto">
        {product.name}
      </p>
      <p className="text-xs text-muted-foreground">
        {product.variants.length} · {t('counter.from')} <span dir="ltr">{formatDzd(minPrice)}</span>
      </p>
    </button>
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
  freeDelivery,
  onFreeDelivery,
  freeDeliveryEnabled,
  wilaya,
  onWilaya,
  customWilaya,
  onCustomWilaya,
  deliveryAddress,
  onDeliveryAddress,
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
  freeDelivery: boolean
  onFreeDelivery: (value: boolean) => void
  freeDeliveryEnabled: boolean
  wilaya: string
  onWilaya: (value: string) => void
  customWilaya: string
  onCustomWilaya: (value: string) => void
  deliveryAddress: string
  onDeliveryAddress: (value: string) => void
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
        {freeDeliveryEnabled && (
          <label className="flex cursor-pointer items-center gap-2 border bg-muted/40 px-3 py-2 text-sm">
            <Checkbox
              checked={freeDelivery}
              onCheckedChange={(value) => onFreeDelivery(Boolean(value))}
            />
            <span>{t('counter.freeShipping')}</span>
          </label>
        )}
        <div className="space-y-2">
          <Label>{t('counter.wilaya')}</Label>
          {wilaya === '__custom' ? (
            <Input
              dir="auto"
              placeholder={t('counter.otherWilaya')}
              value={customWilaya}
              onChange={(e) => onCustomWilaya(e.target.value)}
            />
          ) : (
            <Select value={wilaya} onValueChange={onWilaya}>
              <SelectTrigger aria-label={t('counter.wilaya')}>
                <SelectValue placeholder={t('counter.chooseWilaya')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('counter.chooseWilaya')}</SelectItem>
                {WILAYAS.map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
                <SelectItem value="__custom">{t('counter.otherWilaya')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="counter-address">{t('counter.deliveryAddress')}</Label>
          <Input
            id="counter-address"
            dir="auto"
            placeholder={t('counter.deliveryAddressPlaceholder')}
            value={deliveryAddress}
            onChange={(e) => onDeliveryAddress(e.target.value)}
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
