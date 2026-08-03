import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyRound, Loader2, Lock, User } from 'lucide-react'
import { AuthScreenTopBar } from '@/components/auth-screen-top-bar'
import { BrandLogo } from '@/components/brand-logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/ipc-client'

export function LoginScreen() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.auth.login(username.trim(), password)
      void queryClient.invalidateQueries({ queryKey: ['auth-status'] })
    } catch {
      setError(t('login.invalid'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted p-6">
      <AuthScreenTopBar />
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <BrandLogo className="mx-auto mb-3 h-14" />
          <CardTitle className="text-xl">{t('login.title')}</CardTitle>
          <CardDescription>{t('login.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-username">{t('login.username')}</Label>
              <div className="relative">
                <User className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-username"
                  dir="auto"
                  className="ps-9"
                  placeholder={t('login.usernamePlaceholder')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">{t('login.password')}</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  className="ps-9"
                  type="password"
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {t('login.submit')}
            </Button>
          </form>
          <RecoveryDialog />
        </CardContent>
      </Card>
    </div>
  )
}

function RecoveryDialog() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [open, setOpen] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.auth.recoverOwner({ code: code.trim().toUpperCase(), newPassword })
      setOpen(false)
      setCode('')
      setNewPassword('')
      void queryClient.invalidateQueries({ queryKey: ['auth-status'] })
    } catch {
      setError(t('login.recoveryInvalid'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="mx-auto mt-4 block text-sm text-primary underline-offset-4 hover:underline">
          {t('login.forgot')}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            {t('login.forgotTitle')}
          </DialogTitle>
          <DialogDescription>{t('login.forgotDescription')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recovery-code">{t('login.recoveryCode')}</Label>
            <Input
              id="recovery-code"
              dir="ltr"
              className="font-mono uppercase tracking-widest"
              placeholder={t('login.recoveryCodePlaceholder')}
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recovery-password">{t('login.newPassword')}</Label>
            <Input
              id="recovery-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {t('login.recover')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
