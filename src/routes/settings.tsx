import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, DatabaseBackup, ImagePlus, KeyRound, Loader2, Pencil, Plus, Printer, RotateCcw, Trash2, UserPlus, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/ipc-client'
import { logoUrlFor, saleReceiptHtml, sampleSaleForPreview } from '@/lib/receipt-preview'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/management/page-header'
import type { Category, ReceiptSettings } from '@shared/types'
import type { PublicUser } from '@shared/ipc'

export function SettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title={t('settings.title')} />
      <Tabs defaultValue="receipt" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="w-fit">
          {(['general', 'categories', 'payment', 'receipt', 'printer', 'users', 'data'] as const).map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {t(`settings.tab${tab.charAt(0).toUpperCase()}${tab.slice(1)}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="general" className="min-h-0 flex-1">
          <GeneralTab />
        </TabsContent>
        <TabsContent value="categories" className="min-h-0 flex-1">
          <ProductsCategoriesTab />
        </TabsContent>
        <TabsContent value="payment" className="min-h-0 flex-1">
          <PaymentTab />
        </TabsContent>
        <TabsContent value="receipt" className="min-h-0 flex-1">
          <ReceiptTab />
        </TabsContent>
        <TabsContent value="printer" className="min-h-0 flex-1">
          <PrinterTab />
        </TabsContent>
        <TabsContent value="users" className="min-h-0 flex-1">
          <UsersTab />
        </TabsContent>
        <TabsContent value="data" className="min-h-0 flex-1">
          <DataTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function GeneralTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
  })
  const [storeName, setStoreName] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (settings) {
      setStoreName(settings.store_name)
      setDirty(false)
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: (patch: {
      storeName?: string
      employeesSeeDelivered?: boolean
      employeesCanCollectDeliver?: boolean
    }) =>
      api.settings.updateReceipt({
        storeName: patch.storeName ?? settings!.store_name,
        defaultDepositPercentages: settings!.default_deposit_percentages,
        showDeliveryNote: settings!.show_delivery_note,
        showPhoneOnReceipt: settings!.show_phone_on_receipt,
        showQuantityOnReceipt: settings!.show_quantity_on_receipt,
        dimensionPresets: settings!.dimension_presets,
        receiptWidthMm: settings!.receipt_width_mm ?? 80,
        receiptHeightMm: settings!.receipt_height_mm ?? null,
        receiptFontScale: settings!.receipt_font_scale ?? 1,
        employeesSeeDelivered: patch.employeesSeeDelivered ?? settings!.employees_see_delivered ?? false,
        employeesCanCollectDeliver:
          patch.employeesCanCollectDeliver ?? settings!.employees_can_collect_deliver ?? true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
      setDirty(false)
      toast.success(t('settings.saved'))
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (!settings) return null

  return (
    <div className="max-w-xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.storeName')}</CardTitle>
          <CardDescription>{t('settings.storeNameHelp')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="store-name">{t('settings.storeName')}</Label>
            <Input
              id="store-name"
              dir="auto"
              value={storeName}
              onChange={(e) => {
                setStoreName(e.target.value)
                setDirty(true)
              }}
            />
          </div>
          <Button
            disabled={!dirty || storeName.trim().length === 0 || saveMutation.isPending}
            onClick={() => saveMutation.mutate({ storeName: storeName.trim() })}
          >
            {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.deliveryVisibility')}</CardTitle>
          <CardDescription>{t('settings.deliveryVisibilityHelp')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            label={t('settings.employeesSeeDelivered')}
            hint={t('settings.employeesSeeDeliveredHelp')}
            checked={settings.employees_see_delivered ?? false}
            onChange={(checked) => saveMutation.mutate({ employeesSeeDelivered: checked })}
          />
          <ToggleRow
            label={t('settings.employeesCanCollectDeliver')}
            hint={t('settings.employeesCanCollectDeliverHelp')}
            checked={settings.employees_can_collect_deliver ?? true}
            onChange={(checked) => saveMutation.mutate({ employeesCanCollectDeliver: checked })}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function PaymentTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [newPct, setNewPct] = useState('')
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
  })

  const saveMutation = useMutation({
    mutationFn: (percentages: number[]) =>
      api.settings.updateReceipt({
        storeName: settings!.store_name,
        defaultDepositPercentages: percentages,
        showDeliveryNote: settings!.show_delivery_note,
        showPhoneOnReceipt: settings!.show_phone_on_receipt,
        showQuantityOnReceipt: settings!.show_quantity_on_receipt,
        dimensionPresets: settings!.dimension_presets,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success(t('settings.saved'))
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (!settings) return null

  const addPreset = () => {
    const value = Number(newPct)
    if (!Number.isFinite(value) || value < 1 || value > 100) {
      toast.error(t('settings.invalidPercentage'))
      return
    }
    if (settings.default_deposit_percentages.includes(value)) return
    saveMutation.mutate([...settings.default_deposit_percentages, value].sort((a, b) => a - b))
    setNewPct('')
  }

  const removePreset = (value: number) => {
    saveMutation.mutate(settings.default_deposit_percentages.filter((p) => p !== value))
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t('settings.depositPresets')}</CardTitle>
        <CardDescription>{t('settings.depositPresetsHelp')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {settings.default_deposit_percentages.map((pct) => (
            <span key={pct} className="flex items-center gap-1.5 border bg-muted px-2.5 py-1.5 text-sm" dir="ltr">
              {pct}%
              <button
                type="button"
                onClick={() => removePreset(pct)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`${t('stock.remove')} ${pct}%`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            dir="ltr"
            inputMode="numeric"
            placeholder={t('settings.depositPresetPlaceholder')}
            value={newPct}
            onChange={(e) => setNewPct(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addPreset()
            }}
          />
          <Button variant="outline" onClick={addPreset} disabled={!newPct.trim()}>
            <Plus />
            {t('common.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PrinterTab() {
  const { t } = useTranslation()

  const testMutation = useMutation({
    mutationFn: () => api.printing.testPrint(),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t('settings.testPrintSent'))
      } else {
        toast.error(t('settings.testPrintFailed'))
      }
    },
    onError: () => toast.error(t('settings.testPrintFailed')),
  })

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t('settings.printerTitle')}</CardTitle>
        <CardDescription>{t('settings.printerHelp')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button disabled={testMutation.isPending} onClick={() => testMutation.mutate()}>
          {testMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Printer />}
          {t('settings.testPrint')}
        </Button>
      </CardContent>
    </Card>
  )
}

function ProductsCategoriesTab() {
  return (
    <div className="space-y-4">
      <CategoriesCard />
      <DimensionPresetsTab />
    </div>
  )
}

function categoryErrorMessage(t: (key: string) => string, error: Error): string {
  if (error.message === 'DUPLICATE_CATEGORY') return t('settings.duplicateCategory')
  if (error.message === 'LAST_CATEGORY') return t('settings.lastCategoryError')
  return error.message
}

function CategoriesCard() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deactivateTarget, setDeactivateTarget] = useState<Category | null>(null)
  const [reactivateTarget, setReactivateTarget] = useState<Category | null>(null)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => api.categories.listAll(),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['categories'] })
  }

  const createMutation = useMutation({
    mutationFn: (name: string) => api.categories.create({ name }),
    onSuccess: () => {
      invalidate()
      setNewName('')
      toast.success(t('settings.categoryCreated'))
    },
    onError: (error: Error) => toast.error(categoryErrorMessage(t, error)),
  })

  const renameMutation = useMutation({
    mutationFn: (input: { id: number; name: string }) => api.categories.rename(input),
    onSuccess: () => {
      invalidate()
      setEditingId(null)
      toast.success(t('settings.categoryRenamed'))
    },
    onError: (error: Error) => toast.error(categoryErrorMessage(t, error)),
  })

  const setActiveMutation = useMutation({
    mutationFn: (input: { id: number; active: boolean }) => api.categories.setActive(input),
    onSuccess: () => {
      invalidate()
      setDeactivateTarget(null)
      setReactivateTarget(null)
      toast.success(t('settings.categoryUpdated'))
    },
    onError: (error: Error) => toast.error(categoryErrorMessage(t, error)),
  })

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t('settings.categoriesTitle')}</CardTitle>
        <CardDescription>{t('settings.categoriesHelp')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            dir="auto"
            placeholder={t('settings.categoryNamePlaceholder')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) createMutation.mutate(newName.trim())
            }}
          />
          <Button variant="outline" onClick={() => createMutation.mutate(newName.trim())} disabled={!newName.trim() || createMutation.isPending}>
            <Plus />
            {t('settings.addCategory')}
          </Button>
        </div>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings.categoryName')}</TableHead>
                <TableHead>{t('settings.status')}</TableHead>
                <TableHead className="text-end">{t('settings.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">
                    {editingId === category.id ? (
                      <Input
                        dir="auto"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editingName.trim()) {
                            renameMutation.mutate({ id: category.id, name: editingName.trim() })
                          }
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                    ) : (
                      <span dir="auto">{category.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {category.active ? (
                      <Badge variant="outline">{t('settings.active')}</Badge>
                    ) : (
                      <Badge variant="secondary">{t('settings.inactive')}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {editingId === category.id ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7"
                            disabled={!editingName.trim() || renameMutation.isPending}
                            onClick={() => renameMutation.mutate({ id: category.id, name: editingName.trim() })}
                          >
                            <Check />
                            {t('common.save')}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7" onClick={() => setEditingId(null)}>
                            {t('common.cancel')}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7"
                            onClick={() => {
                              setEditingId(category.id)
                              setEditingName(category.name)
                            }}
                          >
                            <Pencil />
                            {t('settings.rename')}
                          </Button>
                          {category.active ? (
                            <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => setDeactivateTarget(category)}>
                              <Trash2 />
                              {t('settings.removeCategory')}
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="h-7" onClick={() => setReactivateTarget(category)}>
                              <Check />
                              {t('settings.reactivateCategory')}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <Dialog open={deactivateTarget !== null} onOpenChange={() => setDeactivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.deactivateCategoryTitle', { name: deactivateTarget?.name ?? '' })}</DialogTitle>
            <DialogDescription>{t('settings.deactivateCategoryHint')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeactivateTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={setActiveMutation.isPending}
              onClick={() => deactivateTarget && setActiveMutation.mutate({ id: deactivateTarget.id, active: false })}
            >
              {t('settings.removeCategory')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={reactivateTarget !== null} onOpenChange={() => setReactivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.reactivateCategoryTitle', { name: reactivateTarget?.name ?? '' })}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReactivateTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={setActiveMutation.isPending}
              onClick={() => reactivateTarget && setActiveMutation.mutate({ id: reactivateTarget.id, active: true })}
            >
              {t('settings.reactivateCategory')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function ReceiptTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
  })

  const saveMutation = useMutation({
    mutationFn: (input: {
      storeName: string
      defaultDepositPercentages: number[]
      showDeliveryNote: boolean
      showPhoneOnReceipt: boolean
      showQuantityOnReceipt: boolean
      dimensionPresets: string[]
      receiptWidthMm?: number
      receiptHeightMm?: number | null
      receiptFontScale?: number
    }) => api.settings.updateReceipt(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success(t('settings.saved'))
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const logoMutation = useMutation({
    mutationFn: () => api.settings.uploadLogo(),
    onSuccess: (path) => {
      if (path) {
        void queryClient.invalidateQueries({ queryKey: ['settings'] })
        toast.success(t('settings.saved'))
      }
    },
    onError: () => toast.error(t('settings.uploadFailed')),
  })

  if (!settings) return null

  const previewHtml = saleReceiptHtml(sampleSaleForPreview(), settings)

  const save = (patch: {
    storeName?: string
    showDeliveryNote?: boolean
    showPhoneOnReceipt?: boolean
    showQuantityOnReceipt?: boolean
    dimensionPresets?: string[]
    receiptWidthMm?: number
    receiptHeightMm?: number | null
    receiptFontScale?: number
  }) => {
    saveMutation.mutate({
      storeName: patch.storeName ?? settings.store_name,
      defaultDepositPercentages: settings.default_deposit_percentages,
      showDeliveryNote: patch.showDeliveryNote ?? settings.show_delivery_note,
      showPhoneOnReceipt: patch.showPhoneOnReceipt ?? settings.show_phone_on_receipt,
      showQuantityOnReceipt: patch.showQuantityOnReceipt ?? settings.show_quantity_on_receipt,
      dimensionPresets: patch.dimensionPresets ?? settings.dimension_presets,
      receiptWidthMm: patch.receiptWidthMm ?? settings.receipt_width_mm ?? 80,
      receiptHeightMm: patch.receiptHeightMm ?? settings.receipt_height_mm ?? null,
      receiptFontScale: patch.receiptFontScale ?? settings.receipt_font_scale ?? 1,
    })
  }

  return (
    <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        <ReceiptFormatCard settings={settings} onSave={(patch) => save(patch)} />
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.uploadLogo')}</CardTitle>
            <CardDescription>{t('settings.logoHelp')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex h-20 items-center justify-center rounded-none border bg-white p-2">
              <img
                src={logoUrlFor(settings.logo_path)}
                alt="logo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <Button variant="outline" onClick={() => logoMutation.mutate()} disabled={logoMutation.isPending}>
              {logoMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus />}
              {t('settings.uploadLogo')}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.receiptFields')}</CardTitle>
            <CardDescription>{t('settings.receiptFieldsHelp')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow
              label={t('settings.deliveryNote')}
              hint={t('settings.deliveryNoteHelp')}
              checked={settings.show_delivery_note}
              onChange={(checked) => save({ showDeliveryNote: checked })}
            />
            <ToggleRow
              label={t('settings.phoneOnReceipt')}
              hint={t('settings.phoneOnReceiptHelp')}
              checked={settings.show_phone_on_receipt}
              onChange={(checked) => save({ showPhoneOnReceipt: checked })}
            />
            <ToggleRow
              label={t('settings.quantityOnReceipt')}
              hint={t('settings.quantityOnReceiptHelp')}
              checked={settings.show_quantity_on_receipt}
              onChange={(checked) => save({ showQuantityOnReceipt: checked })}
            />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.preview')}</CardTitle>
          <CardDescription>{t('settings.previewHelp')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[520px] rounded-none border bg-white">
            <iframe
              title={t('settings.preview')}
              sandbox=""
              srcDoc={previewHtml}
              className="h-[520px] w-full"
            />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function ReceiptFormatCard({
  settings,
  onSave,
}: {
  settings: ReceiptSettings
  onSave: (patch: { receiptWidthMm?: number; receiptHeightMm?: number | null; receiptFontScale?: number }) => void
}) {
  const { t } = useTranslation()
  const width = settings.receipt_width_mm ?? 80
  const fixedHeight = settings.receipt_height_mm != null
  const scale = settings.receipt_font_scale ?? 1
  const [widthDraft, setWidthDraft] = useState(String(width))
  const [heightDraft, setHeightDraft] = useState(String(settings.receipt_height_mm ?? 300))

  useEffect(() => {
    setWidthDraft(String(settings.receipt_width_mm ?? 80))
    setHeightDraft(String(settings.receipt_height_mm ?? 300))
  }, [settings.receipt_width_mm, settings.receipt_height_mm])

  const commitWidth = () => {
    const value = Number(widthDraft)
    if (!Number.isFinite(value) || value < 40 || value > 210) {
      toast.error(t('settings.invalidWidth'))
      setWidthDraft(String(width))
      return
    }
    if (value !== width) onSave({ receiptWidthMm: value })
  }

  const commitHeight = () => {
    const value = Number(heightDraft)
    if (!Number.isFinite(value) || value < 40 || value > 500) {
      toast.error(t('settings.invalidHeight'))
      setHeightDraft(String(settings.receipt_height_mm ?? 300))
      return
    }
    if (value !== settings.receipt_height_mm) onSave({ receiptHeightMm: value })
  }

  const fontValue = scale >= 1.1 ? 'large' : scale <= 0.9 ? 'small' : 'normal'
  const setFont = (value: 'small' | 'normal' | 'large') => {
    const next = value === 'small' ? 0.85 : value === 'large' ? 1.2 : 1
    if (next !== scale) onSave({ receiptFontScale: next })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.receiptFormat')}</CardTitle>
        <CardDescription>{t('settings.receiptFormatHelp')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="receipt-width">{t('settings.receiptWidth')}</Label>
          <div className="flex gap-2">
            {[58, 80, 100].map((preset) => (
              <Button
                key={preset}
                size="sm"
                variant={width === preset ? 'default' : 'outline'}
                onClick={() => {
                  if (width !== preset) onSave({ receiptWidthMm: preset })
                }}
              >
                {preset} mm
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              id="receipt-width"
              dir="ltr"
              inputMode="numeric"
              value={widthDraft}
              onChange={(e) => setWidthDraft(e.target.value)}
              onBlur={commitWidth}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitWidth()
              }}
            />
            <span className="self-center text-sm text-muted-foreground">mm</span>
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={fixedHeight}
              onCheckedChange={(value) =>
                onSave({
                  receiptHeightMm: value ? Math.min(500, Math.max(40, Number(heightDraft) || 300)) : null,
                })
              }
            />
            {t('settings.receiptFixedHeight')}
          </label>
          {fixedHeight && (
            <div className="flex gap-2">
              <Input
                dir="ltr"
                inputMode="numeric"
                value={heightDraft}
                onChange={(e) => setHeightDraft(e.target.value)}
                onBlur={commitHeight}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitHeight()
                }}
              />
              <span className="self-center text-sm text-muted-foreground">mm</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t('settings.receiptHeightAutoHint')}</p>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label>{t('settings.receiptFontSize')}</Label>
          <div className="flex gap-2">
            {(['small', 'normal', 'large'] as const).map((size) => (
              <Button
                key={size}
                size="sm"
                variant={fontValue === size ? 'default' : 'outline'}
                onClick={() => setFont(size)}
              >
                {t(`settings.fontSize${size.charAt(0).toUpperCase()}${size.slice(1)}`)}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} className="mt-0.5" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <Check className="ms-auto mt-1 size-4 text-muted-foreground" />
    </label>
  )
}

function DimensionPresetsTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [newPreset, setNewPreset] = useState('')
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
  })

  const saveMutation = useMutation({
    mutationFn: (dimensionPresets: string[]) =>
      api.settings.updateReceipt({
        storeName: settings!.store_name,
        defaultDepositPercentages: settings!.default_deposit_percentages,
        showDeliveryNote: settings!.show_delivery_note,
        showPhoneOnReceipt: settings!.show_phone_on_receipt,
        showQuantityOnReceipt: settings!.show_quantity_on_receipt,
        dimensionPresets,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success(t('settings.saved'))
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (!settings) return null

  const addPreset = () => {
    const value = newPreset.trim()
    if (!value) return
    if (settings.dimension_presets.includes(value)) return
    saveMutation.mutate([...settings.dimension_presets, value])
    setNewPreset('')
  }

  const removePreset = (value: string) => {
    saveMutation.mutate(settings.dimension_presets.filter((p) => p !== value))
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t('settings.dimensionPresets')}</CardTitle>
        <CardDescription>{t('settings.dimensionPresetsHelp')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {settings.dimension_presets.map((preset) => (
            <span
              key={preset}
              className="flex items-center gap-1.5 border bg-muted px-2.5 py-1.5 text-sm"
              dir="ltr"
            >
              {preset}
              <button
                type="button"
                onClick={() => removePreset(preset)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`${t('stock.remove')} ${preset}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            dir="ltr"
            placeholder={t('settings.dimensionPresetPlaceholder')}
            value={newPreset}
            onChange={(e) => setNewPreset(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addPreset()
            }}
          />
          <Button variant="outline" onClick={addPreset} disabled={!newPreset.trim()}>
            <Plus />
            {t('common.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DataTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [restoring, setRestoring] = useState(false)
  const [restored, setRestored] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')

  const backup = async () => {
    const path = await api.files.backupDatabase()
    if (path) {
      toast.success(t('settings.backupDone', { path }))
    }
  }

  const restore = async () => {
    setRestoring(true)
    try {
      const result = await api.files.restoreDatabase()
      if (result) {
        setRestored(true)
      }
    } finally {
      setRestoring(false)
    }
  }

  const deleteAllMutation = useMutation({
    mutationFn: (password: string) => api.data.deleteAll(password),
    onSuccess: () => {
      setDeleteOpen(false)
      setDeletePassword('')
      void queryClient.invalidateQueries()
      toast.success(t('settings.deleteAllDone'))
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.backupTitle')}</CardTitle>
          <CardDescription>{t('settings.backupHelp')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void backup()}>
            <DatabaseBackup />
            {t('settings.backupButton')}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.restoreTitle')}</CardTitle>
          <CardDescription>{t('settings.restoreHelp')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {restored ? (
            <p className="text-sm font-semibold text-success">{t('settings.restoreStaged')}</p>
          ) : (
            <>
              <Button variant="destructive" disabled={restoring} onClick={() => void restore()}>
                {restoring && <Loader2 className="size-4 animate-spin" />}
                <RotateCcw />
                {t('settings.restoreButton')}
              </Button>
              <p className="text-xs text-muted-foreground">{t('settings.restoreWarning')}</p>
            </>
          )}
        </CardContent>
      </Card>
      <Card className="border-destructive/40 lg:col-span-2">
        <CardHeader>
          <CardTitle>{t('settings.deleteAllTitle')}</CardTitle>
          <CardDescription>{t('settings.deleteAllHelp')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            {t('settings.deleteAllButton')}
          </Button>
          <p className="text-xs text-muted-foreground">{t('settings.deleteAllWarning')}</p>
        </CardContent>
      </Card>
      <Dialog open={deleteOpen} onOpenChange={(open) => {
        setDeleteOpen(open)
        if (!open) setDeletePassword('')
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.deleteAllTitle')}</DialogTitle>
            <DialogDescription>{t('settings.deleteAllConfirmHint')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="delete-all-password">{t('settings.ownerPassword')}</Label>
              <Input
                id="delete-all-password"
                dir="ltr"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                disabled={deleteAllMutation.isPending || deletePassword.length === 0}
                onClick={() => deleteAllMutation.mutate(deletePassword)}
              >
                {deleteAllMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                {t('settings.deleteAllConfirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UsersTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.list(),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['users'] })
  }

  const createMutation = useMutation({
    mutationFn: (input: { username: string; password: string }) => api.users.create(input),
    onSuccess: () => {
      invalidate()
      setCreateOpen(false)
      toast.success(t('settings.userCreated'))
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const resetMutation = useMutation({
    mutationFn: (input: { id: number; password: string }) => api.users.resetPassword(input),
    onSuccess: () => {
      invalidate()
      setResetOpen(false)
      toast.success(t('settings.passwordReset'))
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const activeMutation = useMutation({
    mutationFn: (input: { id: number; active: boolean }) => api.users.setActive(input),
    onSuccess: () => {
      invalidate()
      toast.success(t('settings.userActivated'))
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [createUsername, setCreateUsername] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [resetTarget, setResetTarget] = useState<PublicUser | null>(null)
  const setResetOpen = (open: boolean) => {
    if (!open) setResetTarget(null)
  }
  const [resetPassword, setResetPassword] = useState('')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>{t('settings.usersTitle')}</CardTitle>
            <CardDescription>{t('settings.usersHelp')}</CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus />
            {t('settings.addUser')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings.username')}</TableHead>
                <TableHead>{t('settings.role')}</TableHead>
                <TableHead className="text-end">{t('settings.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium" dir="auto">
                    {user.username}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'owner' ? 'default' : 'outline'} className={user.active ? '' : 'opacity-50'}>
                      {t(`role.${user.role}`)}
                    </Badge>
                    {!user.active && <span className="ms-2 text-xs text-muted-foreground">{t('settings.inactive')}</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7"
                        disabled={!user.active}
                        onClick={() => setResetTarget(user)}
                      >
                        <KeyRound />
                        {t('settings.resetPassword')}
                      </Button>
                      {user.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive"
                          disabled={!user.active}
                          onClick={() => activeMutation.mutate({ id: user.id, active: false })}
                        >
                          <UserX />
                          {t('settings.deactivate')}
                        </Button>
                      )}
                      {user.role !== 'owner' && !user.active && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7"
                          onClick={() => activeMutation.mutate({ id: user.id, active: true })}
                        >
                          <Check />
                          {t('settings.activate')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.addUser')}</DialogTitle>
            <DialogDescription>{t('settings.addUserHelp')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="user-username">{t('settings.username')}</Label>
              <Input
                id="user-username"
                dir="auto"
                value={createUsername}
                onChange={(e) => setCreateUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">{t('settings.password')}</Label>
              <Input
                id="user-password"
                dir="ltr"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={createMutation.isPending || createUsername.trim().length < 2 || createPassword.length < 4}
              onClick={() => createMutation.mutate({ username: createUsername.trim(), password: createPassword })}
            >
              {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {t('settings.createAccount')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={resetTarget !== null} onOpenChange={() => setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.resetPasswordFor', { name: resetTarget?.username ?? '' })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="reset-password">{t('settings.newPassword')}</Label>
              <Input
                id="reset-password"
                dir="ltr"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={resetMutation.isPending || resetPassword.length < 4}
              onClick={() => {
                if (resetTarget) resetMutation.mutate({ id: resetTarget.id, password: resetPassword })
              }}
            >
              {resetMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
