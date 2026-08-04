import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ElectronAPI } from '@shared/ipc'
import { LoginScreen } from './login'
import { SetupScreen } from './setup'
import { I18nProvider } from '@/lib/i18n'
import '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'

const mockApi = {
  auth: { status: vi.fn(), setupOwner: vi.fn(), login: vi.fn(), logout: vi.fn(), recoverOwner: vi.fn() },
  products: { list: vi.fn().mockResolvedValue([]), listFull: vi.fn().mockResolvedValue([]), create: vi.fn(), deactivate: vi.fn() },
  suppliers: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), setActive: vi.fn() },
  categories: { list: vi.fn().mockResolvedValue([]) },
  sales: { create: vi.fn(), get: vi.fn(), recent: vi.fn(), addPayment: vi.fn(), setStatus: vi.fn(), cancel: vi.fn() },
  printing: { printReceipt: vi.fn() },
  settings: {
    get: vi.fn().mockResolvedValue({
      id: 1,
      store_name: 'MLM',
      logo_path: null,
      default_deposit_percentages: [30],
      show_delivery_note: true,
      show_phone_on_receipt: true,
      show_quantity_on_receipt: true,
      updated_at: '',
    }),
    updateReceipt: vi.fn(),
    uploadLogo: vi.fn(),
  },
} as unknown as ElectronAPI

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  window.electronAPI = mockApi
})

function wrap(node: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter>{node}</MemoryRouter>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>,
  )
}

describe('auth screens branding (ticket 10)', () => {
  it('login shows the supplied logo image', async () => {
    wrap(<LoginScreen />)
    expect(await screen.findByRole('img', { name: /My Life Mattress/ })).toBeInTheDocument()
    const img = screen.getByRole('img', { name: /My Life Mattress/ }) as HTMLImageElement
    expect(img.src).toMatch(/brand\/logo\.png$/)
  })

  it('setup shows the supplied logo image', async () => {
    wrap(<SetupScreen />)
    expect(await screen.findByRole('img', { name: /My Life Mattress/ })).toBeInTheDocument()
  })

  it('login never shows demo-account buttons (security requirement)', async () => {
    wrap(<LoginScreen />)
    await screen.findByRole('button', { name: 'Se connecter' })
    expect(screen.queryByText(/d[ée]mo/i)).not.toBeInTheDocument()
  })

  it('no prefilled credentials anywhere on login', async () => {
    wrap(<LoginScreen />)
    await screen.findByRole('button', { name: 'Se connecter' })
    const inputs = [...document.querySelectorAll('input')] as HTMLInputElement[]
    for (const input of inputs) {
      expect(input.value).toBe('')
    }
  })
})
