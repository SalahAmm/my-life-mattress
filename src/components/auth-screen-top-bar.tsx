import { Languages, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAppLanguage } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

export function AuthScreenTopBar() {
  const { theme, toggleTheme } = useTheme()
  const { language, toggleLanguage } = useAppLanguage()
  const { t } = useTranslation()

  return (
    <div className="fixed end-4 top-4 flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
        onClick={toggleTheme}
      >
        {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 font-bold"
        onClick={toggleLanguage}
        aria-label={t('common.language')}
      >
        <Languages className="size-5" />
        {language === 'fr' ? 'ع' : 'FR'}
      </Button>
    </div>
  )
}
