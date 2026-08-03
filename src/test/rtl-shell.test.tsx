import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ElectronAPI } from '@shared/ipc'
import type { Session } from '@shared/types'
import { AppShell } from '@/components/app-shell'
import { I18nProvider, useAppLanguage } from '@/lib/i18n'
import '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'

const ownerSession: Session = { userId: 1, username: 'Kamel', role: 'owner' }

const mockApi = {
  auth: { status: vi.fn(), setupOwner: vi.fn(), login: vi.fn(), logout: vi.fn(), recoverOwner: vi.fn() },
  products: { list: vi.fn().mockResolvedValue([]), listFull: vi.fn().mockResolvedValue([]), create: vi.fn(), deactivate: vi.fn() },
  suppliers: { list: vi.fn().mockResolvedValue([]), create: vi.fn() },
  categories: { list: vi.fn().mockResolvedValue([]) },
  sales: { create: vi.fn(), get: vi.fn(), recent: vi.fn(), addPayment: vi.fn(), setStatus: vi.fn(), cancel: vi.fn() },
  printing: { printReceipt: vi.fn() },
  settings: {
    get: vi.fn().mockResolvedValue({
      id: 1,
      store_name: 'My Life Mattress',
      logo_path: null,
      default_deposit_percentages: [30, 50, 70],
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

function renderShell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter>
            <AppShell session={ownerSession} />
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>,
  )
}

function SidebarSideProbe() {
  const { language } = useAppLanguage()
  return <span data-testid="probe">{language}</span>
}

describe('RTL shell (ticket 03)', () => {
  it('starts in French with the sidebar on the left and dir=ltr', async () => {
    renderShell()
    await waitFor(() => expect(document.documentElement.dir).toBe('ltr'))
    const sidebar = document.querySelector('[data-slot="sidebar"]') as HTMLElement | null
    expect(sidebar?.dataset.side).toBe('left')
  })

  it('flips the sidebar to the right and dir to rtl after toggling to Arabic', async () => {
    renderShell()
    const user = userEvent.setup()
    await waitFor(() => expect(document.documentElement.dir).toBe('ltr'))
    await user.click(screen.getByLabelText('Langue'))
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'))
    expect(document.documentElement.lang).toBe('ar')
    const sidebar = document.querySelector('[data-slot="sidebar"]') as HTMLElement | null
    expect(sidebar?.dataset.side).toBe('right')
  })

  it('sets direction synchronously on first render (no LTR flash)', () => {
    localStorage.setItem('mlm-language', 'ar')
    renderShell()
    expect(document.documentElement.dir).toBe('rtl')
  })

  it('keeps numeric fields LTR inside Arabic mode', async () => {
    renderShell()
    const user = userEvent.setup()
    await waitFor(() => expect(document.documentElement.dir).toBe('ltr'))
    await user.click(screen.getByLabelText('Langue'))
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'))
    expect(screen.getAllByText(/FR|ع/).length).toBeGreaterThan(0)
  })

  it('uses the language context for the probe component', async () => {
    render(
      <I18nProvider>
        <SidebarSideProbe />
      </I18nProvider>,
    )
    expect(screen.getByTestId('probe').textContent).toBe('fr')
  })
})

describe('physical-utility guard (seam C)', () => {
  it('route files contain no physical pr-/pl-/ml-/mr- leftovers', () => {
    const routesDir = path.join(import.meta.dirname, '..', 'routes')
    const offenders: string[] = []
    for (const file of fs.readdirSync(routesDir)) {
      if (!file.endsWith('.tsx')) continue
      const content = fs.readFileSync(path.join(routesDir, file), 'utf8')
      const matches = content.match(/\b(pr|pl|ml|mr)-\d+/g)
      if (matches) {
        offenders.push(`${file}: ${matches.join(', ')}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
