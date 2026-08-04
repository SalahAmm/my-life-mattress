import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Banknote, Download, HandCoins, Printer, ReceiptText, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { formatDzd } from '@shared/money'
import { toCsv } from '@shared/csv'
import { renderReportHtml } from '@shared/printing/report'
import type { Session } from '@shared/types'
import type { ReportRange } from '@shared/ipc'
import { api } from '@/lib/ipc-client'
import { PREVIEW_FONT_URLS } from '@/lib/receipt-preview'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/management/page-header'
import { KpiCard } from '@/components/management/kpi-card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/management/empty-state'
import { ReceiptText as ReceiptIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PrintPreviewDialog } from '@/components/print-preview-dialog'
import { cn } from '@/lib/utils'

type RangeTab = 'today' | 'week' | 'month' | 'year' | 'custom'

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function rangeFor(tab: RangeTab, custom?: { from: Date; to: Date }): ReportRange {
  const now = new Date()
  let from: Date
  let to: Date
  switch (tab) {
    case 'today':
      from = startOfDay(now)
      to = new Date(from.getTime() + 86400000)
      break
    case 'week': {
      const day = (now.getDay() + 6) % 7
      from = new Date(startOfDay(now).getTime() - day * 86400000)
      to = new Date(from.getTime() + 7 * 86400000)
      break
    }
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      to = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      break
    case 'year':
      from = new Date(now.getFullYear(), 0, 1)
      to = new Date(now.getFullYear() + 1, 0, 1)
      break
    case 'custom':
      from = startOfDay(custom?.from ?? now)
      to = new Date(startOfDay(custom?.to ?? now).getTime() + 86400000)
      break
  }
  return { from: from.toISOString(), to: to.toISOString() }
}

export function ReportsPage({ session }: { session: Session }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<RangeTab>('today')
  const [printOpen, setPrintOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const range = useMemo(() => rangeFor(tab), [tab])
  const rangeLabel = useMemo(() => t(`reports.${tab}`), [tab, t])

  const { data: summary, isLoading } = useQuery({
    queryKey: ['report-summary', range.from, range.to],
    queryFn: () => api.reports.summary(range),
  })
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
  })
  const { data: sales = [] } = useQuery({
    queryKey: ['report-sales', range.from, range.to],
    queryFn: () => api.reports.sales(range),
  })

  const reportHtml =
    summary && settings
      ? renderReportHtml({ settings, summary, sales, fontUrls: PREVIEW_FONT_URLS, rangeLabel, range })
      : ''

  const csvContent = useMemo(() => {
    if (sales.length === 0) return toCsv([], [])
    return toCsv(
      sales.map((sale) => ({
        'N°': String(sale.id).padStart(4, '0'),
        Client: sale.customer_name ?? '',
        Wilaya: sale.wilaya ?? '',
        Total: sale.total,
        Payé: sale.paid,
        'Solde dû': sale.remaining,
      })),
      ['N°', 'Client', 'Wilaya', 'Total', 'Payé', 'Solde dû'],
    )
  }, [sales])

  const saveCsv = async () => {
    const path = await api.files.saveCsv({ defaultName: `rapport-${tab}.csv`, content: csvContent })
    if (path) {
      setCsvOpen(false)
      toast.success(t('reports.csvSaved'))
    }
  }

  void session

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t('reports.title')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" disabled={!summary} onClick={() => setCsvOpen(true)}>
              <Download />
              {t('reports.exportCsv')}
            </Button>
            <Button disabled={!summary} onClick={() => setPrintOpen(true)}>
              <Printer />
              {t('reports.print')}
            </Button>
          </div>
        }
      />
      <Tabs value={tab} onValueChange={(value) => setTab(value as RangeTab)} className="w-fit">
        <TabsList>
          <TabsTrigger value="today">{t('reports.today')}</TabsTrigger>
          <TabsTrigger value="week">{t('reports.week')}</TabsTrigger>
          <TabsTrigger value="month">{t('reports.month')}</TabsTrigger>
          <TabsTrigger value="year">{t('reports.year')}</TabsTrigger>
        </TabsList>
      </Tabs>
      {isLoading || !summary ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label={t('reports.revenue')} value={formatDzd(summary.revenue)} icon={TrendingUp} status="info" />
            <KpiCard label={t('reports.deposits')} value={formatDzd(summary.depositsCollected)} icon={HandCoins} status="success" />
            <KpiCard label={t('reports.outstanding')} value={formatDzd(summary.outstanding)} icon={Banknote} status="warning" />
            <KpiCard label={t('reports.salesCount')} value={String(summary.salesCount)} icon={ReceiptText} status="info" />
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="flex min-h-0 flex-col">
              <CardContent className="flex min-h-0 flex-1 flex-col p-4">
                <h2 className="mb-3 font-bold">{t('reports.topProducts')}</h2>
                {summary.perProduct.length === 0 ? (
                  <EmptyState icon={ReceiptIcon} title={t('reports.noSales')} hint={t('reports.noSalesHint')} />
                ) : (
                  <div className="min-h-0 flex-1 space-y-3 overflow-auto">
                    {summary.perProduct.map((item, index) => {
                      const max = summary.perProduct[0].revenue || 1
                      return (
                        <div key={item.label} className="flex items-center gap-3">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-none bg-muted text-xs font-bold">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="truncate text-sm font-medium" dir="auto">
                                {item.label}
                              </p>
                              <p className="shrink-0 text-sm" dir="ltr">
                                {item.units} · {formatDzd(item.revenue)}
                              </p>
                            </div>
                            <div className="mt-1 h-2 w-full rounded-none bg-muted">
                              <div
                                className="h-2 rounded-none bg-primary"
                                style={{ width: `${Math.max(6, (item.revenue / max) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="flex min-h-0 flex-col">
              <CardContent className="flex min-h-0 flex-1 flex-col p-4">
                <h2 className="mb-3 font-bold">{t('reports.salesTable')}</h2>
                <div className="min-h-0 flex-1 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow>
                        <TableHead>{t('reports.orderNo')}</TableHead>
                        <TableHead>{t('reports.customer')}</TableHead>
                        <TableHead>{t('reports.wilaya')}</TableHead>
                        <TableHead className="text-end">{t('reports.total')}</TableHead>
                        <TableHead className="text-end">{t('reports.paid')}</TableHead>
                        <TableHead className="text-end">{t('reports.due')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell dir="ltr">{String(sale.id).padStart(4, '0')}</TableCell>
                          <TableCell dir="auto">{sale.customer_name}</TableCell>
                          <TableCell dir="auto">{sale.wilaya ?? '—'}</TableCell>
                          <TableCell className="text-end" dir="ltr">{formatDzd(sale.total)}</TableCell>
                          <TableCell className="text-end text-success" dir="ltr">{formatDzd(sale.paid)}</TableCell>
                          <TableCell className={cn('text-end', sale.remaining > 0 && 'font-semibold text-destructive')} dir="ltr">
                            {formatDzd(sale.remaining)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
      {reportHtml && (
        <PrintPreviewDialog
          open={printOpen}
          onOpenChange={setPrintOpen}
          title={t('reports.print')}
          html={reportHtml}
          onPrint={() => api.printing.printReport(range, rangeLabel)}
          printing={false}
          printError={null}
        />
      )}
      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('reports.exportCsv')}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[420px] overflow-auto rounded-none border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>{t('reports.orderNo')}</TableHead>
                  <TableHead>{t('reports.customer')}</TableHead>
                  <TableHead>{t('reports.wilaya')}</TableHead>
                  <TableHead className="text-end">{t('reports.total')}</TableHead>
                  <TableHead className="text-end">{t('reports.paid')}</TableHead>
                  <TableHead className="text-end">{t('reports.due')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell dir="ltr">{String(sale.id).padStart(4, '0')}</TableCell>
                    <TableCell dir="auto">{sale.customer_name}</TableCell>
                    <TableCell dir="auto">{sale.wilaya ?? '—'}</TableCell>
                    <TableCell className="text-end" dir="ltr">{formatDzd(sale.total)}</TableCell>
                    <TableCell className="text-end" dir="ltr">{formatDzd(sale.paid)}</TableCell>
                    <TableCell className="text-end" dir="ltr">{formatDzd(sale.remaining)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCsvOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void saveCsv()}>
              <Download />
              {t('reports.saveCsv')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
