import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ImagePlus, KeyRound, Loader2, Plus, Trash2, UserPlus, UserX } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/management/page-header'
import type { PublicUser } from '@shared/ipc'

export function SettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title={t('settings.title')} />
      <Tabs defaultValue="receipt" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="w-fit">
          {(['general', 'categories', 'payment', 'receipt', 'printer', 'users', 'data'] as const).map((tab) => (
            <TabsTrigger key={tab} value={tab} disabled={tab === 'general' || tab === 'payment' || tab === 'printer' || tab === 'data'}>
              {t(`settings.tab${tab.charAt(0).toUpperCase()}${tab.slice(1)}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="receipt" className="min-h-0 flex-1">
          <ReceiptTab />
        </TabsContent>
        <TabsContent value="categories" className="min-h-0 flex-1">
          <DimensionPresetsTab />
        </TabsContent>
        <TabsContent value="users" className="min-h-0 flex-1">
          <UsersTab />
        </TabsContent>
        {(['general', 'payment', 'printer', 'data'] as const).map((tab) => (
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
      dimensionPresets: string[]
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
  }) => {
    saveMutation.mutate({
      storeName: patch.storeName ?? settings.store_name,
      defaultDepositPercentages: settings.default_deposit_percentages,
      showDeliveryNote: patch.showDeliveryNote ?? settings.show_delivery_note,
      showPhoneOnReceipt: patch.showPhoneOnReceipt ?? settings.show_phone_on_receipt,
      showQuantityOnReceipt: patch.showQuantityOnReceipt ?? settings.show_quantity_on_receipt,
      dimensionPresets: patch.dimensionPresets ?? settings.dimension_presets,
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
