import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Clock, HandCoins, MapPin, Package } from 'lucide-react'
import { toast } from 'sonner'
import { formatDzd } from '@shared/money'
import type { SaleWithDetails, Session } from '@shared/types'
import { api } from '@/lib/ipc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/management/page-header'
import { EmptyState } from '@/components/management/empty-state'
import { KpiCard } from '@/components/management/kpi-card'
import { StatusBadge } from '@/components/management/status-badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { variantLabel } from '@shared/variants'

type DeliveryTab = 'ordered' | 'delivered' | 'all'

export function DeliveryPage({ session }: { session: Session }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<DeliveryTab>('ordered')
  const [collectSale, setCollectSale] = useState<SaleWithDetails | null>(null)
  const [deliverSale, setDeliverSale] = useState<SaleWithDetails | null>(null)

  const { data: allSales = [] } = useQuery({
    queryKey: ['delivery-sales'],
    queryFn: () => api.sales.list({}),
  })

  const pending = useMemo(() => allSales.filter((s) => s.status === 'ordered'), [allSales])
  const deliveredCount = useMemo(() => allSales.filter((s) => s.status === 'delivered').length, [allSales])
  const toCollect = useMemo(() => pending.reduce((sum, s) => sum + s.remaining, 0), [pending])
  const sales = useMemo(() => (tab === 'all' ? allSales : allSales.filter((s) => s.status === tab)), [allSales, tab])

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

  const collectMutation = useMutation({
    mutationFn: (input: { saleId: number; amount: number }) =>
      api.sales.addPayment({ saleId: input.saleId, amount: input.amount, type: 'balance', enteredAsPercentage: null }),
    onSuccess: () => {
      invalidate()
      toast.success(t('delivery.paymentAdded'))
      setCollectSale(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

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

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title={t('delivery.title')} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label={t('delivery.pending')} value={String(pending.length)} icon={Clock} status="warning" />
        <KpiCard label={t('delivery.delivered')} value={String(deliveredCount)} icon={CheckCircle2} status="success" />
        {session.role === 'owner' && (
          <KpiCard label={t('delivery.toCollect')} value={formatDzd(toCollect)} icon={HandCoins} status="info" />
        )}
      </div>
      <Tabs value={tab} onValueChange={(value) => setTab(value as DeliveryTab)} className="w-fit">
        <TabsList>
          <TabsTrigger value="ordered">{t('delivery.pending')}</TabsTrigger>
          <TabsTrigger value="delivered">{t('delivery.delivered')}</TabsTrigger>
          <TabsTrigger value="all">{t('delivery.all')}</TabsTrigger>
        </TabsList>
      </Tabs>
      {sales.length === 0 ? (
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
                  <OrderCard
                    key={sale.id}
                    sale={sale}
                    onCollect={() => setCollectSale(sale)}
                    onDeliver={() => setDeliverSale(sale)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {collectSale && (
        <CollectDialog
          sale={collectSale}
          onClose={() => setCollectSale(null)}
          onConfirm={(amount) => collectMutation.mutate({ saleId: collectSale.id, amount })}
          submitting={collectMutation.isPending}
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
    </div>
  )
}

function OrderCard({
  sale,
  onCollect,
  onDeliver,
}: {
  sale: SaleWithDetails
  onCollect: () => void
  onDeliver: () => void
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
          <span className="text-xs text-muted-foreground" dir="ltr">
            {new Date(sale.created_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
        <div>
          <p className="font-semibold" dir="auto">
            {sale.customer_name}
          </p>
          {sale.customer_phone && (
            <p className="text-sm text-muted-foreground" dir="ltr">
              {sale.customer_phone}
            </p>
          )}
          {sale.delivery_address && (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground" dir="auto">
              <MapPin className="size-3.5" />
              {sale.delivery_address}
            </p>
          )}
        </div>
        <div className="space-y-1 border-y py-2 text-sm">
          {sale.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate" dir="auto">
                {item.product_variant_id != null
                  ? `${item.product_name ?? ''} ${variantLabel(item.variant_name, item.dimension)}`.trim()
                  : item.custom_description}
              </span>
              <span className="shrink-0 text-muted-foreground" dir="ltr">
                ×{item.quantity} {formatDzd(item.quantity * item.unit_price_at_sale)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="space-y-0.5">
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">{t('delivery.total')}</span>
              <span dir="ltr">{formatDzd(sale.total)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">{t('delivery.paid')}</span>
              <span className="font-medium text-success" dir="ltr">
                {formatDzd(sale.paid)}
              </span>
            </div>
            <div className="flex justify-between gap-6 text-base font-bold">
              <span>{t('delivery.due')}</span>
              <span className={cn(sale.remaining > 0 && 'text-destructive')} dir="ltr">
                {formatDzd(sale.remaining)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {sale.status === 'ordered' && sale.remaining > 0 && (
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={onCollect}>
                <HandCoins />
                {t('delivery.collectBalance')}
              </Button>
            )}
            {sale.status === 'ordered' && (
              <Button size="sm" variant="outline" onClick={onDeliver}>
                <CheckCircle2 />
                {t('delivery.markDelivered')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CollectDialog({
  sale,
  onClose,
  onConfirm,
  submitting,
}: {
  sale: SaleWithDetails
  onClose: () => void
  onConfirm: (amount: number) => void
  submitting: boolean
}) {
  const { t } = useTranslation()
  const [amount, setAmount] = useState(String(sale.remaining))
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('delivery.collectTitle')}</DialogTitle>
          <DialogDescription>{sale.customer_name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex justify-between rounded-none border bg-muted/50 px-3 py-2 text-sm">
            <span>{t('delivery.due')}</span>
            <span className="font-bold" dir="ltr">
              {formatDzd(sale.remaining)}
            </span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="collect-amount">{t('delivery.amount')}</Label>
            <Input
              id="collect-amount"
              dir="ltr"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button disabled={submitting || Number(amount) <= 0} onClick={() => onConfirm(Number(amount))}>
              {t('delivery.collect')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
