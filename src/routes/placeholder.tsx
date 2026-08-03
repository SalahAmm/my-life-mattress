import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function PlaceholderPage({ icon: Icon, titleKey }: { icon: LucideIcon; titleKey: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-xl font-bold">{t(titleKey)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('placeholder.title')}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{t('placeholder.description')}</p>
      </div>
    </div>
  )
}
