import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, ChevronDown, ChevronUp, Clock, HandCoins, History, MapPin, Package, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDzd } from '@shared/money'
import type { SaleWithDetails, Session } from '@shared/types'
import { api } from '@/lib/ipc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/management/page-header'
import { EmptyState } from '@/components/management/empty-state'
import { KpiCard } from '@/components/management/kpi-card'
import { StatusBadge } from '@/components/management/status-badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { variantLabel } from '@shared/variants'

type DeliveryTab = 'ordered' | 'delivered'
type HistoryFilter = 'today' | 'week' | 'month' | 'all'

function inHistoryRange(createdAt: string, filter: HistoryFilter): boolean {
  if (filter === 'all') return true
  const date = new Date(createdAt)
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const today = startOfDay(now)
  if (filter === 'today') {
    return date >= today && date < new Date(today.getTime() + 86400000)
  }
  if (filter === 'week') {
    const day = (now.getDay() + 6) % 7
    const start = new Date(today.getTime() - day * 86400000)
    return date >= start && date < new Date(start.getTime() + 7 * 86400000)
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return date >= start
}

export function DeliveryPage({ session }: { session: Session }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<DeliveryTab>('ordered')
  const [deliverSale, setDeliverSale] = useState<SaleWithDetails | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SaleWithDetails | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('week')
  const [historyCollapsed, setHistoryCollapsed] = useState(false)

  const { data: allSales = [] } = useQuery({
    queryKey: ['delivery-sales'],
    queryFn: () => api.sales.list({}),
  })

  const pending = useMemo(() => allSales.filter((s) => s.status === 'ordered'), [allSales])
  const delivered = useMemo(() => allSales.filter((s) => s.status === 'delivered'), [allSales])
  const deliveredCount = delivered.length
  const toCollect = useMemo(() => pending.reduce((sum, s) => sum + s.remaining, 0), [pending])
  const sales = useMemo(() => (tab === 'ordered' ? pending : delivered), [tab, pending, delivered])
  const filteredHistory = useMemo(
    () => delivered.filter((s) => inHistoryRange(s.created_at, historyFilter)),
    [delivered, historyFilter],
  )

  const groups = useMemo(() => {
    const map = new Map<string, SaleWithDetails[]>()
    for (const sale of sales) {
      const key = sale.wilaya ?? ''
      map.set(key, [...(map.get(key) ?? []), sale])
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [sales])

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['delivery-sales'] })
  }

  const deliverMutation = useMutation({
    mutationFn: async (sale: SaleWithDetails) => {
      if (sale.remaining > 0) {
        await api.sales.addPayment({
          saleId: sale.id,
          amount: sale.remaining,
          type: 'balance',
          enteredAsPercentage: null,
        })
      }
      await api.sales.setStatus({ saleId: sale.id, status: 'delivered' })
    },
    onSuccess: () => {
      invalidate()
      toast.success(t('delivery.markedDelivered'))
      setDeliverSale(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (saleId: number) => api.sales.delete(saleId),
    onSuccess: () => {
      invalidate()
      toast.success(t('delivery.deleted'))
      setDeleteTarget(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const clearMutation = useMutation({
    mutationFn: () => api.sales.clearDelivered(),
    onSuccess: (count) => {
      invalidate()
      toast.success(t('delivery.cleared', { count }))
      setClearOpen(false)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const isOwner = session.role === 'owner'

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title={t('delivery.title')} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label={t('delivery.pending')} value={String(pending.length)} icon={Clock} status="warning" />
        <KpiCard label={t('delivery.delivered')} value={String(deliveredCount)} icon={CheckCircle2} status="success" />
        {isOwner && (
          <KpiCard label={t('delivery.toCollect')} value={formatDzd(toCollect)} icon={HandCoins} status="info" />
        )}
      </div>
      <Tabs value={tab} onValueChange={(value) => setTab(value as DeliveryTab)} className="w-fit">
        <TabsList>
          <TabsTrigger value="ordered">{t('delivery.pending')}</TabsTrigger>
          <TabsTrigger value="delivered">{t('delivery.delivered')}</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === 'ordered' ? (
        sales.length === 0 ? (
          <Card className="flex flex-1 flex-col items-center justify-center">
            <EmptyState icon={Package} title={t('delivery.noOrders')} hint={t('delivery.noOrdersPending')} />
          </Card>
        ) : (
          <div className="min-h-0 flex-1 space-y-5 overflow-auto pe-1">
            {groups.map(([wilaya, groupSales]) => (
              <div key={wilaya || 'none'}>
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  <h2 className="font-bold" dir="auto">
                    {wilaya || t('delivery.withoutWilaya')}
                  </h2>
                  <Badge variant="secondary">{groupSales.length}</Badge>
                </div>
                <div className="space-y-3">
                  {groupSales.map((sale) => (
                    <OrderCard key={sale.id} sale={sale} onDeliver={() => setDeliverSale(sale)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <DeliveredHistory
          sales={filteredHistory}
          total={delivered.length}
          filter={historyFilter}
          onFilter={setHistoryFilter}
          collapsed={historyCollapsed}
          onToggleCollapsed={() => setHistoryCollapsed((v) => !v)}
          isOwner={isOwner}
          onDelete={(sale) => setDeleteTarget(sale)}
          onClear={() => setClearOpen(true)}
        />
      )}

      {deliverSale && (
        <DeliverDialog
          sale={deliverSale}
          onClose={() => setDeliverSale(null)}
          onConfirm={() => deliverMutation.mutate(deliverSale)}
          submitting={deliverMutation.isPending}
        />
      )}

      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('delivery.deleteTitle')}</DialogTitle>
              <DialogDescription>
                N° {String(deleteTarget.id).padStart(4, '0')} — {deleteTarget.customer_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('delivery.deleteHint')}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTarget.id)}>
                  {t('delivery.deleteConfirm')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('delivery.clearTitle')}</DialogTitle>
            <DialogDescription>{t('delivery.clearHint', { count: delivered.length })}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" disabled={clearMutation.isPending} onClick={() => clearMutation.mutate()}>
              {t('delivery.clearConfirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DeliveredHistory({
  sales,
  total,
  filter,
  onFilter,
  collapsed,
  onToggleCollapsed,
  isOwner,
  onDelete,
  onClear,
}: {
  sales: SaleWithDetails[]
  total: number
  filter: HistoryFilter
  onFilter: (filter: HistoryFilter) => void
  collapsed: boolean
  onToggleCollapsed: () => void
  isOwner: boolean
  onDelete: (sale: SaleWithDetails) => void
  onClear: () => void
}) {
  const { t } = useTranslation()

  const filters: { key: HistoryFilter; label: string }[] = [
    { key: 'today', label: t('delivery.filterToday') },
    { key: 'week', label: t('delivery.filterWeek') },
    { key: 'month', label: t('delivery.filterMonth') },
    { key: 'all', label: t('delivery.filterAll') },
  ]

  const groups = useMemo(() => {
    const map = new Map<string, SaleWithDetails[]>()
    for (const sale of sales) {
      const key = sale.wilaya ?? ''
      map.set(key, [...(map.get(key) ?? []), sale])
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [sales])

  return (
    <div className="min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <Card className="shrink-0">
        <CardContent className="space-y-3 p-4">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex w-full items-center gap-2 text-start"
            aria-expanded={!collapsed}
          >
            <History className="size-4 text-primary" />
            <h2 className="font-bold">{t('delivery.history')}</h2>
            <Badge variant="secondary">{sales.length}</Badge>
            {isOwner && total > sales.length && (
              <span className="text-xs text-muted-foreground">
                ({t('delivery.historyTotal', { count: total })})
              </span>
            )}
            <span className="ms-auto">
              {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            </span>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => onFilter(f.key)}
                className={cn(
                  'rounded-none border px-3 py-1.5 text-sm transition-colors',
                  filter === f.key
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:bg-muted',
                )}
              >
                {f.label}
              </button>
            ))}
            {isOwner && total > 0 && (
              <Button variant="destructive" size="sm" className="h-8 ms-auto" onClick={onClear}>
                <Trash2 />
                {t('delivery.clearAll')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {collapsed ? null : sales.length === 0 ? (
        <Card className="flex flex-1 flex-col items-center justify-center">
          <EmptyState icon={Package} title={t('delivery.noOrders')} hint={t('delivery.historyEmpty')} />
        </Card>
      ) : (
        <div className="min-h-0 flex-1 space-y-5 overflow-auto pe-1 pt-3">
          {groups.map(([wilaya, groupSales]) => (
            <div key={wilaya || 'none'}>
              <div className="mb-2 flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                <h2 className="font-bold" dir="auto">
                  {wilaya || t('delivery.withoutWilaya')}
                </h2>
                <Badge variant="secondary">{groupSales.length}</Badge>
              </div>
              <div className="space-y-3">
                {groupSales.map((sale) => (
                  <OrderCard
                    key={sale.id}
                    sale={sale}
                    onDeliver={undefined}
                    onDelete={isOwner ? () => onDelete(sale) : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCard({
  sale,
  onDeliver,
  onDelete,
}: {
  sale: SaleWithDetails
  onDeliver?: () => void
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold" dir="ltr">
            N° {String(sale.id).padStart(4, '0')}
          </span>
          <StatusBadge
            status={sale.status === 'delivered' ? 'success' : sale.status === 'cancelled' ? 'destructive' : 'warning'}
            label={t(`delivery.status.${sale.status}`)}
          />
          <span className="ms-auto text-xs text-muted-foreground" dir="ltr">
            {new Date(sale.created_at).toLocaleDateString('fr-FR')}
            {sale.created_at && (
              <span className="ms-1 opacity-80">
                {new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </span>
          {onDelete && (
            <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={onDelete} aria-label={t('delivery.deleteOrder')}>
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-base font-bold" dir="auto">
                {sale.customer_name}
              </p>
              {sale.customer_phone && (
                <p className="text-sm text-muted-foreground" dir="ltr">
                  {sale.customer_phone}
                  {sale.wilaya ? ` · ${sale.wilaya}` : ''}
                </p>
              )}
              {sale.delivery_address && (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground" dir="auto">
                  <MapPin className="size-3.5" />
                  {sale.delivery_address}
                </p>
              )}
            </div>
            <div className="space-y-1 border-t pt-2 text-sm text-muted-foreground">
              {sale.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate" dir="auto">
                    {item.product_variant_id != null
                      ? `${item.product_name ?? ''} ${variantLabel(item.variant_name, item.dimension)}`.trim()
                      : item.custom_description}
                  </span>
                  <span className="shrink-0" dir="ltr">
                    ×{item.quantity} {formatDzd(item.quantity * item.unit_price_at_sale)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="shrink-0 text-end">
            <p className="text-xs font-semibold text-muted-foreground">{t('delivery.due')}</p>
            <p
              className={cn('text-3xl font-black', sale.remaining > 0 ? 'text-destructive' : 'text-success')}
              dir="ltr"
            >
              {formatDzd(sale.remaining)}
            </p>
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              <p>
                {t('delivery.total')} <span dir="ltr">{formatDzd(sale.total)}</span>
              </p>
              <p>
                {t('delivery.paid')}{' '}
                <span className="font-medium text-success" dir="ltr">
                  {formatDzd(sale.paid)}
                </span>
              </p>
            </div>
          </div>
        </div>
        {sale.status === 'ordered' && onDeliver && (
          <div className="flex justify-end border-t pt-3">
            <Button
              size="sm"
              variant={sale.remaining > 0 ? 'default' : 'outline'}
              className={sale.remaining > 0 ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''}
              onClick={onDeliver}
            >
              <CheckCircle2 />
              {sale.remaining > 0 ? t('delivery.collectAndDeliver') : t('delivery.markDelivered')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DeliverDialog({
  sale,
  onClose,
  onConfirm,
  submitting,
}: {
  sale: SaleWithDetails
  onClose: () => void
  onConfirm: () => void
  submitting: boolean
}) {
  const { t } = useTranslation()
  const collectFirst = sale.remaining > 0
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('delivery.markDelivered')}</DialogTitle>
          <DialogDescription>{sale.customer_name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {collectFirst && (
            <div className="flex justify-between rounded-none border border-warning/40 bg-warning/15 px-3 py-2 text-sm">
              <span>{t('delivery.remainingToCollect')}</span>
              <span className="font-bold" dir="ltr">
                {formatDzd(sale.remaining)}
              </span>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {collectFirst ? t('delivery.deliverCollectHint') : t('delivery.deliverDirectHint')}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button disabled={submitting} onClick={onConfirm}>
              {collectFirst ? t('delivery.collectAndDeliver') : t('delivery.deliverNow')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
