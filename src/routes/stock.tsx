import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, ImagePlus, Loader2, Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDzd } from '@shared/money'
import { variantLabel } from '@shared/variants'
import type { NewProductInput, NewVariantInput, ProductWithVariants } from '@shared/types'
import { api } from '@/lib/ipc-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/management/page-header'
import { EmptyState } from '@/components/management/empty-state'
import { KpiCard } from '@/components/management/kpi-card'
import { productImageUrl } from '@/lib/product-image'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type StockFilter = 'all' | 'in' | 'low' | 'out'

function Chip({
  active,
  onClick,
  onRemove,
  removeLabel,
  children,
}: {
  active: boolean
  onClick: () => void
  onRemove?: () => void
  removeLabel?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-none border transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
      )}
    >
      <button type="button" onClick={onClick} className="px-3 py-1.5 text-sm hover:opacity-80">
        {children}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="px-1.5 py-1.5 text-xs opacity-60 hover:opacity-100"
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </span>
  )
}

function SortableHead({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: 'asc' | 'desc'
  onClick: () => void
}) {
  return (
    <TableHead>
      <button
        type="button"
        onClick={onClick}
        className={cn('inline-flex items-center gap-1 font-semibold', active && 'text-primary')}
      >
        {label}
        {active && <span dir="ltr">{dir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </TableHead>
  )
}

function variantStatus(quantity: number, threshold: number): 'in' | 'low' | 'out' {
  if (quantity <= 0) return 'out'
  if (quantity <= threshold) return 'low'
  return 'in'
}

export function StockPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductWithVariants | null>(null)
  const [copyProduct, setCopyProduct] = useState<ProductWithVariants | null>(null)
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
  const [filter, setFilter] = useState<StockFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [sortKey, setSortKey] = useState<'product' | 'price' | 'stock' | 'supplier'>('product')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

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

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const matches = (p: ProductWithVariants) => {
      if (selectedSupplier !== null && p.supplier_id !== selectedSupplier) return false
      if (selectedCategory !== null && p.category_id !== selectedCategory) return false
      if (!query) return true
      if (p.name.toLowerCase().includes(query)) return true
      if ((p.supplier_name ?? '').toLowerCase().includes(query)) return true
      return p.variants.some((v) => v.dimension.toLowerCase().includes(query) || (v.name ?? '').toLowerCase().includes(query))
    }
    const flat = products
      .filter(matches)
      .flatMap((product) =>
        product.variants
          .filter((v) => filter === 'all' || variantStatus(v.quantity_on_hand, v.low_stock_threshold) === filter)
          .map((variant) => ({ product, variant })),
      )
    const sorted = [...flat].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortKey) {
        case 'product':
          return a.product.name.localeCompare(b.product.name) * dir
        case 'price':
          return (a.variant.price - b.variant.price) * dir
        case 'stock':
          return (a.variant.quantity_on_hand - b.variant.quantity_on_hand) * dir
        case 'supplier':
          return (a.product.supplier_name ?? '').localeCompare(b.product.supplier_name ?? '') * dir
      }
    })
    return sorted
  }, [products, filter, search, selectedSupplier, selectedCategory, sortKey, sortDir])

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t('stock.title')}
        action={
          <Button
            onClick={() => {
              setEditingProduct(null)
              setDialogOpen(true)
            }}
          >
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
        {(filter !== 'all' || search || selectedSupplier !== null || selectedCategory !== null) && (
          <Button variant="ghost" onClick={() => { setFilter('all'); setSearch(''); setSelectedSupplier(null); setSelectedCategory(null) }}>
            {t('stock.all')}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip active={selectedSupplier === null} onClick={() => setSelectedSupplier(null)}>
          {t('stock.allSuppliers')}
        </Chip>
        {suppliers.map((s) => (
          <Chip
            key={s.id}
            active={selectedSupplier === s.id}
            onClick={() => setSelectedSupplier(selectedSupplier === s.id ? null : s.id)}
            onRemove={() => {
              setSelectedSupplier(null)
              removeSupplierMutation.mutate(s.id)
            }}
            removeLabel={t('stock.removeSupplier')}
          >
            {s.name}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip active={selectedCategory === null} onClick={() => setSelectedCategory(null)}>
          {t('stock.allCategories')}
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c.id}
            active={selectedCategory === c.id}
            onClick={() => setSelectedCategory(selectedCategory === c.id ? null : c.id)}
          >
            {c.name}
          </Chip>
        ))}
      </div>
      {products.length === 0 ? (
        <Card className="flex flex-1 flex-col items-center justify-center">
          <EmptyState icon={Package} title={t('stock.noProducts')} hint={t('stock.noProductsHint')} />
        </Card>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col border bg-card">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-14"></TableHead>
                  <SortableHead label={t('stock.product')} active={sortKey === 'product'} dir={sortDir} onClick={() => toggleSort('product')} />
                  <TableHead>{t('stock.category')}</TableHead>
                  <SortableHead label={t('stock.supplier')} active={sortKey === 'supplier'} dir={sortDir} onClick={() => toggleSort('supplier')} />
                  <TableHead>{t('stock.variant')}</TableHead>
                  <SortableHead label={t('stock.price')} active={sortKey === 'price'} dir={sortDir} onClick={() => toggleSort('price')} />
                  <SortableHead label={t('stock.stock')} active={sortKey === 'stock'} dir={sortDir} onClick={() => toggleSort('stock')} />
                  <TableHead className="text-end">{t('stock.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ product, variant }) => (
                  <TableRow key={variant.id}>
                    <TableCell>
                      {productImageUrl(product.image_path) ? (
                        <img
                          src={productImageUrl(product.image_path)!}
                          alt={product.name}
                          className="size-10 rounded-none border object-cover"
                        />
                      ) : (
                        <span className="flex size-10 items-center justify-center rounded-none border bg-muted text-sm font-bold text-muted-foreground">
                          {product.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium" dir="auto">
                      {product.name}
                    </TableCell>
                    <TableCell>{product.category_name ?? '—'}</TableCell>
                    <TableCell dir="auto">{product.supplier_name ?? '—'}</TableCell>
                    <TableCell dir="auto">{variantLabel(variant.name, variant.dimension)}</TableCell>
                    <TableCell dir="ltr">{formatDzd(variant.price)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StockBadge quantity={variant.quantity_on_hand} threshold={variant.low_stock_threshold} />
                        <span className="font-semibold" dir="ltr">
                          {variant.quantity_on_hand}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          aria-label={t('stock.edit')}
                          onClick={() => {
                            setEditingProduct(product)
                            setCopyProduct(null)
                            setDialogOpen(true)
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          aria-label={t('stock.duplicate')}
                          onClick={() => {
                            setEditingProduct(null)
                            setCopyProduct(product)
                            setDialogOpen(true)
                          }}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive"
                          onClick={() => deactivateMutation.mutate(product.id)}
                        >
                          {t('stock.deactivate')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      <AddProductDialog
        key={editingProduct?.id ?? copyProduct?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editingProduct}
        copyOf={copyProduct}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      />
      <AddSupplierDialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen} />
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
  initial,
  copyOf,
  categories,
  suppliers,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: ProductWithVariants | null
  copyOf?: ProductWithVariants | null
  categories: { id: number; name: string }[]
  suppliers: { id: number; name: string }[]
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const editing = Boolean(initial)
  const prefill = initial ?? copyOf ?? null
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
  })
  const [name, setName] = useState(prefill?.name ?? '')
  const [categoryId, setCategoryId] = useState<string>(prefill?.category_id ? String(prefill.category_id) : 'none')
  const [supplierId, setSupplierId] = useState<string>(prefill?.supplier_id ? String(prefill.supplier_id) : 'none')
  const [newSupplier, setNewSupplier] = useState('')
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [imagePath, setImagePath] = useState<string | null>(prefill?.image_path ?? null)
  const [variants, setVariants] = useState<NewVariantInput[]>(
    prefill && prefill.variants.length > 0
      ? prefill.variants.map((v) => ({
          id: v.id,
          dimension: v.dimension,
          name: v.name,
          price: v.price,
          sku: v.sku,
          initialStock: initial ? v.quantity_on_hand : 0,
          lowStockThreshold: v.low_stock_threshold,
        }))
      : [{ dimension: '', name: '', price: 0, sku: null, initialStock: 0, lowStockThreshold: 0 }],
  )

  const uploadImageMutation = useMutation({
    mutationFn: () => api.products.uploadImage(),
    onSuccess: (path) => {
      if (path) setImagePath(path)
    },
  })

  const createSupplierMutation = useMutation({
    mutationFn: (input: { name: string; phone: string | null }) => api.suppliers.create(input),
  })

  const createProductMutation = useMutation({
    mutationFn: async (input: NewProductInput) => {
      if (initial) {
        await api.products.update({
          id: initial.id,
          name: input.name,
          categoryId: input.categoryId,
          supplierId: input.supplierId,
          imagePath: input.imagePath,
          variants: input.variants.map((v) => ({
            id: (v as { id?: number }).id,
            dimension: v.dimension,
            name: v.name,
            price: v.price,
            sku: v.sku,
          })),
        })
        return
      }
      return api.products.create(input)
    },
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
      setImagePath(null)
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
      imagePath,
      variants: variants.map((v) => ({ ...v, name: v.name || null, price: Math.round(v.price), initialStock: Math.round(v.initialStock), lowStockThreshold: Math.round(v.lowStockThreshold) })),
    })
  }

  const updateVariant = (index: number, patch: Partial<NewVariantInput>) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  }

  const applyPreset = (dimension: string) => {
    setVariants((prev) => {
      const emptyIndex = prev.findIndex((v) => !v.dimension.trim())
      if (emptyIndex >= 0) {
        return prev.map((v, i) => (i === emptyIndex ? { ...v, dimension } : v))
      }
      return [...prev, { dimension, name: '', price: 0, sku: null, initialStock: 0, lowStockThreshold: 0 }]
    })
  }

  const quickAddPreset = () => {
    if (!settings) return
    const dimension = variants.find((v) => v.dimension.trim())?.dimension.trim()
    if (!dimension) return
    if (settings.dimension_presets.includes(dimension)) return
    void api.settings
      .updateReceipt({
        storeName: settings.store_name,
        defaultDepositPercentages: settings.default_deposit_percentages,
        showDeliveryNote: settings.show_delivery_note,
        showPhoneOnReceipt: settings.show_phone_on_receipt,
        showQuantityOnReceipt: settings.show_quantity_on_receipt,
        dimensionPresets: [...settings.dimension_presets, dimension],
      })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['settings'] })
        toast.success(t('stock.saved'))
      })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? t('stock.editProduct') : t('stock.addProduct')}</DialogTitle>
          <DialogDescription className="sr-only">
            {editing ? t('stock.editProduct') : t('stock.addProduct')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-36 w-full max-w-[200px] shrink-0 items-center justify-center overflow-hidden rounded-none border bg-muted">
              {imagePath ? (
                <img src={productImageUrl(imagePath)!} alt={t('stock.productPhoto')} className="h-full w-full object-contain" />
              ) : (
                <ImagePlus className="size-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Button variant="outline" onClick={() => uploadImageMutation.mutate()} disabled={uploadImageMutation.isPending}>
                {uploadImageMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus />}
                {t('stock.uploadPhoto')}
              </Button>
              {imagePath && (
                <Button variant="ghost" size="sm" onClick={() => setImagePath(null)}>
                  {t('common.cancel')}
                </Button>
              )}
            </div>
          </div>
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
            <div className="flex flex-wrap items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">{t('stock.dimensionPresets')}</Label>
              {(settings?.dimension_presets ?? []).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded-none border border-border bg-card px-2.5 py-1 text-sm transition-colors hover:bg-muted"
                  dir="ltr"
                >
                  {preset}
                </button>
              ))}
              <button
                type="button"
                onClick={quickAddPreset}
                className="rounded-none border border-dashed border-primary/40 px-2 py-1 text-primary transition-colors hover:bg-primary/5"
                aria-label={t('stock.quickAddPreset')}
                title={t('stock.quickAddPreset')}
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('stock.variants')}</Label>
              <Button size="sm" variant="outline" onClick={() => setVariants((prev) => [...prev, { dimension: '', name: '', price: 0, sku: null, initialStock: 0, lowStockThreshold: 0 }])}>
                <Plus />
                {t('stock.addVariant')}
              </Button>
            </div>
            {variants.map((variant, index) => (
              <div key={index} className="space-y-3 border p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">
                    {t('stock.variant')} {index + 1}
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={variants.length === 1}
                    onClick={() => setVariants((prev) => prev.filter((_, i) => i !== index))}
                    aria-label={t('stock.removeVariant')}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <VariantField label={t('stock.variantName')} className="xl:col-span-2">
                    <Input dir="auto" value={variant.name ?? ''} onChange={(e) => updateVariant(index, { name: e.target.value })} placeholder={t('stock.variantNamePlaceholder')} />
                  </VariantField>
                  <VariantField label={t('stock.dimension')} className="xl:col-span-1">
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
                </div>
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

function VariantField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
