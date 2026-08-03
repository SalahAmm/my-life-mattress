import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Package, Plus, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'
import { formatDzd } from '@shared/money'
import { variantLabel } from '@shared/variants'
import type { NewProductInput, NewVariantInput, ProductWithVariants } from '@shared/types'
import { api } from '@/lib/ipc-client'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/management/page-header'
import { EmptyState } from '@/components/management/empty-state'
import { KpiCard } from '@/components/management/kpi-card'

type StockFilter = 'all' | 'in' | 'low' | 'out'

function variantStatus(quantity: number, threshold: number): 'in' | 'low' | 'out' {
  if (quantity <= 0) return 'out'
  if (quantity <= threshold) return 'low'
  return 'in'
}

export function StockPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
  const [filter, setFilter] = useState<StockFilter>('all')
  const [search, setSearch] = useState('')

  const { data: products = [] } = useQuery({
    queryKey: ['stock-products'],
    queryFn: () => api.products.listFull(),
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  })
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.suppliers.list(),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => api.products.deactivate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stock-products'] })
      void queryClient.invalidateQueries({ queryKey: ['counter-products'] })
      toast.success(t('stock.saved'))
    },
  })

  const removeSupplierMutation = useMutation({
    mutationFn: (id: number) => api.suppliers.setActive({ id, active: false }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      void queryClient.invalidateQueries({ queryKey: ['stock-products'] })
      toast.success(t('stock.saved'))
    },
  })

  const counts = useMemo(() => {
    const variants = products.flatMap((p) => p.variants)
    return {
      in: variants.filter((v) => variantStatus(v.quantity_on_hand, v.low_stock_threshold) === 'in').length,
      low: variants.filter((v) => variantStatus(v.quantity_on_hand, v.low_stock_threshold) === 'low').length,
      out: variants.filter((v) => variantStatus(v.quantity_on_hand, v.low_stock_threshold) === 'out').length,
    }
  }, [products])

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase()
    const matches = (p: ProductWithVariants) => {
      if (filter !== 'all' && !p.variants.some((v) => variantStatus(v.quantity_on_hand, v.low_stock_threshold) === filter)) {
        return false
      }
      if (!query) return true
      if (p.name.toLowerCase().includes(query)) return true
      if ((p.supplier_name ?? '').toLowerCase().includes(query)) return true
      return p.variants.some((v) => v.dimension.toLowerCase().includes(query))
    }
    const filtered = products.filter(matches)
    const bySupplier = new Map<number | null, ProductWithVariants[]>()
    for (const product of filtered) {
      const key = product.supplier_id
      bySupplier.set(key, [...(bySupplier.get(key) ?? []), product])
    }
    const supplierGroups = suppliers
      .map((s) => ({ id: s.id, name: s.name, products: bySupplier.get(s.id) ?? [] }))
      .filter((g) => g.products.length > 0)
    const unassigned = bySupplier.get(null) ?? []
    return { supplierGroups, unassigned }
  }, [products, suppliers, filter, search])

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t('stock.title')}
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus />
            {t('stock.addProduct')}
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label={t('stock.inStock')}
          value={String(counts.in)}
          icon={Package}
          status="success"
          onClick={() => setFilter(filter === 'in' ? 'all' : 'in')}
        />
        <KpiCard
          label={t('stock.lowStock')}
          value={String(counts.low)}
          icon={Package}
          status="warning"
          onClick={() => setFilter(filter === 'low' ? 'all' : 'low')}
        />
        <KpiCard
          label={t('stock.outOfStock')}
          value={String(counts.out)}
          icon={Package}
          status="destructive"
          onClick={() => setFilter(filter === 'out' ? 'all' : 'out')}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-sm"
          placeholder={t('stock.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="outline" onClick={() => setSupplierDialogOpen(true)}>
          <Plus />
          {t('stock.addSupplier')}
        </Button>
        {(filter !== 'all' || search) && (
          <Button variant="ghost" onClick={() => { setFilter('all'); setSearch('') }}>
            {t('stock.all')}
          </Button>
        )}
      </div>
      {products.length === 0 ? (
        <Card className="flex flex-1 flex-col items-center justify-center">
          <EmptyState icon={Package} title={t('stock.noProducts')} hint={t('stock.noProductsHint')} />
        </Card>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-auto pe-1">
          {groups.supplierGroups.map((group) => (
            <SupplierGroup
              key={group.id}
              name={group.name}
              products={group.products}
              filter={filter}
              onDeactivateSupplier={() => removeSupplierMutation.mutate(group.id)}
              onDeactivateProduct={(id) => deactivateMutation.mutate(id)}
              deactivateLabel={t('stock.removeSupplier')}
              deactivateTitle={t('stock.removeSupplierConfirm')}
              deactivateHint={t('stock.removeSupplierConfirmHint')}
            />
          ))}
          {groups.unassigned.length > 0 && (
            <SupplierGroup
              key="none"
              name={t('stock.withoutSupplier')}
              products={groups.unassigned}
              filter={filter}
              onDeactivateSupplier={undefined}
              onDeactivateProduct={(id) => deactivateMutation.mutate(id)}
              deactivateLabel=""
              deactivateTitle=""
              deactivateHint=""
            />
          )}
        </div>
      )}
      <AddProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      />
      <AddSupplierDialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen} />
    </div>
  )
}

function SupplierGroup({
  name,
  products,
  filter,
  onDeactivateSupplier,
  onDeactivateProduct,
  deactivateLabel,
  deactivateTitle,
  deactivateHint,
}: {
  name: string
  products: ProductWithVariants[]
  filter: StockFilter
  onDeactivateSupplier?: () => void
  onDeactivateProduct: (id: number) => void
  deactivateLabel: string
  deactivateTitle: string
  deactivateHint: string
}) {
  const { t } = useTranslation()
  const visibleProducts = products
    .map((product) => ({
      ...product,
      variants:
        filter === 'all'
          ? product.variants
          : product.variants.filter((v) => variantStatus(v.quantity_on_hand, v.low_stock_threshold) === filter),
    }))
    .filter((product) => product.variants.length > 0)
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center bg-primary/10 text-primary">
          <User className="size-4" />
        </span>
        <h2 className="font-bold" dir="auto">
          {name}
        </h2>
        <Badge variant="secondary">{products.length}</Badge>
        {onDeactivateSupplier && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="ms-auto size-7 text-destructive" aria-label={deactivateLabel}>
                <Trash2 className="size-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{deactivateTitle}</AlertDialogTitle>
                <AlertDialogDescription>{deactivateHint}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={onDeactivateSupplier}>{t('stock.remove')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <div className="space-y-3">
        {visibleProducts.map((product) => (
          <Card key={product.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2">
                <p className="font-semibold" dir="auto">
                  {product.name}
                </p>
                {product.category_name && <Badge variant="secondary">{product.category_name}</Badge>}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="ms-auto text-destructive">
                      {t('stock.deactivate')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('stock.deactivateConfirm')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('stock.deactivateConfirmHint')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeactivateProduct(product.id)}>
                        {t('stock.deactivate')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <Separator />
              <div className="space-y-1.5">
                {product.variants.map((variant) => (
                  <div key={variant.id} className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="w-28 font-medium" dir="auto">
                      {variantLabel(variant.name, variant.dimension)}
                    </span>
                    <span className="w-28 text-muted-foreground" dir="ltr">
                      {formatDzd(variant.price)}
                    </span>
                    <StockBadge quantity={variant.quantity_on_hand} threshold={variant.low_stock_threshold} />
                    <span className="w-16 text-end font-semibold" dir="ltr">
                      {variant.quantity_on_hand}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function AddSupplierDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')

  const createMutation = useMutation({
    mutationFn: (input: { name: string; phone: string | null }) => api.suppliers.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success(t('stock.saved'))
      onOpenChange(false)
      setName('')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('stock.addSupplier')}</DialogTitle>
          <DialogDescription className="sr-only">{t('stock.addSupplier')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="supplier-name">{t('stock.supplierName')}</Label>
            <Input id="supplier-name" dir="auto" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button
            className="w-full"
            disabled={!name.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate({ name: name.trim(), phone: null })}
          >
            {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('stock.addSupplier')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface StockLabels {
  inStock: string
  lowStock: string
  outOfStock: string
}

function StockBadge({ quantity, threshold }: { quantity: number; threshold: number }) {
  const { t } = useTranslation()
  const labels = t('stock', { returnObjects: true }) as unknown as StockLabels
  if (quantity <= 0) return <Badge variant="destructive">{labels.outOfStock}</Badge>
  if (quantity <= threshold) return <Badge variant="default" className="bg-amber-500">{labels.lowStock}</Badge>
  return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{labels.inStock}</Badge>
}

function AddProductDialog({
  open,
  onOpenChange,
  categories,
  suppliers,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: { id: number; name: string }[]
  suppliers: { id: number; name: string }[]
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState<string>('none')
  const [supplierId, setSupplierId] = useState<string>('none')
  const [newSupplier, setNewSupplier] = useState('')
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [variants, setVariants] = useState<NewVariantInput[]>([
    { dimension: '', name: '', price: 0, sku: null, initialStock: 0, lowStockThreshold: 0 },
  ])

  const createSupplierMutation = useMutation({
    mutationFn: (input: { name: string; phone: string | null }) => api.suppliers.create(input),
  })

  const createProductMutation = useMutation({
    mutationFn: (input: NewProductInput) => api.products.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stock-products'] })
      void queryClient.invalidateQueries({ queryKey: ['counter-products'] })
      toast.success(t('stock.saved'))
      onOpenChange(false)
      setName('')
      setCategoryId('none')
      setSupplierId('none')
      setNewSupplier('')
      setShowNewSupplier(false)
      setVariants([{ dimension: '', name: '', price: 0, sku: null, initialStock: 0, lowStockThreshold: 0 }])
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const save = async () => {
    if (!name.trim()) {
      toast.error(t('stock.productNamePlaceholder'))
      return
    }
    if (variants.some((v) => !v.dimension.trim() || v.price <= 0)) {
      toast.error(t('counter.invalidPrice'))
      return
    }
    let supplier: number | null = supplierId === 'none' ? null : Number(supplierId)
    if (showNewSupplier && newSupplier.trim()) {
      supplier = await createSupplierMutation.mutateAsync({ name: newSupplier.trim(), phone: null })
    }
    createProductMutation.mutate({
      name: name.trim(),
      categoryId: categoryId === 'none' ? null : Number(categoryId),
      supplierId: supplier,
      variants: variants.map((v) => ({ ...v, price: Math.round(v.price), initialStock: Math.round(v.initialStock), lowStockThreshold: Math.round(v.lowStockThreshold) })),
    })
  }

  const updateVariant = (index: number, patch: Partial<NewVariantInput>) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('stock.addProduct')}</DialogTitle>
          <DialogDescription className="sr-only">{t('stock.addProduct')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">{t('stock.productName')}</Label>
            <Input id="product-name" dir="auto" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('stock.productNamePlaceholder')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('stock.category')}</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('stock.chooseCategory')}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('stock.supplier')}</Label>
              {showNewSupplier ? (
                <div className="flex gap-2">
                  <Input
                    dir="auto"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    placeholder={t('stock.supplierName')}
                  />
                  <Button variant="ghost" size="icon" onClick={() => setShowNewSupplier(false)} aria-label={t('common.cancel')}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : (
                <Select value={supplierId} onValueChange={(value) => (value === '__new' ? setShowNewSupplier(true) : setSupplierId(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('stock.chooseSupplier')}</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new">{t('stock.newSupplier')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('stock.variants')}</Label>
              <Button size="sm" variant="outline" onClick={() => setVariants((prev) => [...prev, { dimension: '', name: '', price: 0, sku: null, initialStock: 0, lowStockThreshold: 0 }])}>
                <Plus />
                {t('stock.addVariant')}
              </Button>
            </div>
            {variants.map((variant, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] items-end gap-2">
                <VariantField label={t('stock.variantName')}>
                  <Input dir="auto" value={variant.name ?? ''} onChange={(e) => updateVariant(index, { name: e.target.value })} placeholder={t('stock.variantNamePlaceholder')} />
                </VariantField>
                <VariantField label={t('stock.dimension')}>
                  <Input dir="auto" value={variant.dimension} onChange={(e) => updateVariant(index, { dimension: e.target.value })} placeholder={t('stock.dimensionPlaceholder')} />
                </VariantField>
                <VariantField label={t('stock.price')}>
                  <Input dir="ltr" inputMode="numeric" value={variant.price === 0 ? '' : String(variant.price)} onChange={(e) => updateVariant(index, { price: Number(e.target.value) || 0 })} />
                </VariantField>
                <VariantField label={t('stock.initialStock')}>
                  <Input dir="ltr" inputMode="numeric" value={variant.initialStock === 0 ? '' : String(variant.initialStock)} onChange={(e) => updateVariant(index, { initialStock: Number(e.target.value) || 0 })} />
                </VariantField>
                <VariantField label={t('stock.threshold')}>
                  <Input dir="ltr" inputMode="numeric" value={variant.lowStockThreshold === 0 ? '' : String(variant.lowStockThreshold)} onChange={(e) => updateVariant(index, { lowStockThreshold: Number(e.target.value) || 0 })} />
                </VariantField>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={variants.length === 1}
                  onClick={() => setVariants((prev) => prev.filter((_, i) => i !== index))}
                  aria-label={t('stock.removeVariant')}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button className="w-full" onClick={() => void save()} disabled={createProductMutation.isPending}>
            {createProductMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('stock.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function VariantField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
