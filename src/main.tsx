import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'
import './lib/i18n'
import { I18nProvider } from '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter>
            <App />
          </MemoryRouter>
          <Toaster />
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
)
