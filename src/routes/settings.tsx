import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Check, ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/ipc-client'
import { logoUrlFor, saleReceiptHtml, sampleSaleForPreview } from '@/lib/receipt-preview'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function SettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col gap-4">
      <h1 className="text-xl font-bold">{t('settings.title')}</h1>
      <Tabs defaultValue="receipt" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="w-fit">
          {(['general', 'categories', 'payment', 'receipt', 'printer', 'users', 'data'] as const).map((tab) => (
            <TabsTrigger key={tab} value={tab} disabled={tab !== 'receipt'}>
              {t(`settings.tab${tab.charAt(0).toUpperCase()}${tab.slice(1)}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="receipt" className="min-h-0 flex-1">
          <ReceiptTab />
        </TabsContent>
        {(['general', 'categories', 'payment', 'printer', 'users', 'data'] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card className="p-6 text-center text-muted-foreground">{t('settings.comingSoon')}</Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
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
  }) => {
    saveMutation.mutate({
      storeName: patch.storeName ?? settings.store_name,
      defaultDepositPercentages: settings.default_deposit_percentages,
      showDeliveryNote: patch.showDeliveryNote ?? settings.show_delivery_note,
      showPhoneOnReceipt: patch.showPhoneOnReceipt ?? settings.show_phone_on_receipt,
      showQuantityOnReceipt: patch.showQuantityOnReceipt ?? settings.show_quantity_on_receipt,
    })
  }

  return (
    <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="space-y-4">
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
