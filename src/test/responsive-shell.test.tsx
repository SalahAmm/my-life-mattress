import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ElectronAPI } from '@shared/ipc'
import type { Session } from '@shared/types'
import { AppShell } from '@/components/app-shell'
import { I18nProvider } from '@/lib/i18n'
import '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'
import { Dialog, DialogContent } from '@/components/ui/dialog'

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

function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
  const mql = window.matchMedia
  window.matchMedia = ((query: string) => {
    const matches = query.includes('max-width') ? width < 768 : false
    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }
  }) as typeof mql
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  window.electronAPI = mockApi
  setViewport(1280)
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

describe('responsive shell (ticket 04)', () => {
  it('desktop mode renders no mobile menu trigger', async () => {
    setViewport(1280)
    renderShell()
    await waitFor(() => expect(screen.getByText('Kamel')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('mobile mode shows the trigger and opens the Sheet navigation', async () => {
    setViewport(600)
    renderShell()
    const user = userEvent.setup()
    const trigger = await screen.findByRole('button', { name: 'Menu' })
    await user.click(trigger)
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Vente Rapide').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Guide').length).toBeGreaterThan(0)
  })

  it('navigating from the mobile sheet closes it', async () => {
    setViewport(600)
    renderShell()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Menu' }))
    const dialog = await screen.findAllByRole('dialog')
    expect(dialog.length).toBeGreaterThan(0)
    await user.click(within(dialog[0]).getByText('Guide'))
    await waitFor(() => expect(screen.queryAllByRole('dialog')).toHaveLength(0))
  })

  it('dialogs are height-constrained with internal scrolling', () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dialog">Contenu</DialogContent>
      </Dialog>,
    )
    const content = screen.getByTestId('dialog')
    expect(content.className).toMatch(/max-h-/)
    expect(content.className).toMatch(/overflow-y-auto/)
  })

  it('main content padding is responsive', async () => {
    renderShell()
    await waitFor(() => expect(screen.getByText('Kamel')).toBeInTheDocument())
    const mains = [...document.querySelectorAll('main')]
    const content = mains.find((m) => m.className.includes('p-4')) as HTMLElement
    expect(content.className).toMatch(/p-4/)
    expect(content.className).toMatch(/md:p-6/)
  })
})
