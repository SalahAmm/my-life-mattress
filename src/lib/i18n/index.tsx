import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { Direction } from 'radix-ui'
import fr from './fr.json'
import ar from './ar.json'

export type Language = 'fr' | 'ar'

const STORAGE_KEY = 'mlm-language'

export function detectLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'ar' ? 'ar' : 'fr'
}

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: detectLanguage(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
})

const initialLanguage = detectLanguage()
document.documentElement.lang = initialLanguage
document.documentElement.dir = initialLanguage === 'ar' ? 'rtl' : 'ltr'
document.title = initialLanguage === 'ar' ? 'ماي لايف ماتراس' : 'My Life Mattress'

interface I18nContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectLanguage())

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.title = language === 'ar' ? 'ماي لايف ماتراس' : 'My Life Mattress'
    void i18n.changeLanguage(language)
  }, [language])

  const setLanguage = (lang: Language) => {
    localStorage.setItem(STORAGE_KEY, lang)
    setLanguageState(lang)
    void i18n.changeLanguage(lang)
  }

  const value: I18nContextValue = {
    language,
    setLanguage,
    toggleLanguage: () => setLanguage(language === 'fr' ? 'ar' : 'fr'),
  }

  return (
    <Direction.DirectionProvider dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
    </Direction.DirectionProvider>
  )
}

export function useAppLanguage(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useAppLanguage must be used within I18nProvider')
  return context
}
