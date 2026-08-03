import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Lock, ShieldCheck, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/ipc-client'
import { AuthScreenTopBar } from '@/components/auth-screen-top-bar'
import { BrandLogo } from '@/components/brand-logo'

export function SetupScreen() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (username.trim().length < 3) {
      setError(t('setup.usernameTooShort'))
      return
    }
    if (password.length < 6) {
      setError(t('setup.passwordTooShort'))
      return
    }
    if (password !== confirm) {
      setError(t('setup.mismatch'))
      return
    }

    setSubmitting(true)
    try {
      const result = await api.auth.setupOwner({ username: username.trim(), password })
      setRecoveryCode(result.recoveryCode)
    } catch {
      setError(t('setup.error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (recoveryCode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted p-6">
        <AuthScreenTopBar />
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-lg bg-gold">
              <ShieldCheck className="size-8 text-white" />
            </div>
            <CardTitle className="text-xl">{t('setup.successTitle')}</CardTitle>
            <CardDescription>{t('setup.successDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-dashed border-amber-400 bg-amber-50 p-4 text-center dark:bg-amber-950/30">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {t('setup.recoveryTitle')}
              </p>
              <p className="mt-2 font-mono text-3xl font-bold tracking-[0.3em] text-primary">
                {recoveryCode}
              </p>
              <p className="mt-3 text-xs text-amber-800/80 dark:text-amber-300/80">
                {t('setup.recoveryPrompt')}
              </p>
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={() => {
                void queryClient.invalidateQueries({ queryKey: ['auth-status'] })
              }}
            >
              {t('setup.continue')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted p-6">
      <AuthScreenTopBar />
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <BrandLogo className="mx-auto mb-3 h-14" />
          <CardTitle className="text-xl">{t('setup.title')}</CardTitle>
          <CardDescription>{t('setup.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="setup-username">{t('setup.username')}</Label>
              <div className="relative">
                <User className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="setup-username"
                  dir="auto"
                  className="ps-9"
                  placeholder={t('setup.usernamePlaceholder')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-password">{t('setup.password')}</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="setup-password"
                  className="ps-9"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-confirm">{t('setup.confirmPassword')}</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="setup-confirm"
                  className="ps-9"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {t('setup.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
