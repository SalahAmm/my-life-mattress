import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ElectronAPI, ReportSummary } from '@shared/ipc'
import type { Session } from '@shared/types'
import { ReportsPage } from './reports'
import { I18nProvider } from '@/lib/i18n'
import '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'

const ownerSession: Session = { userId: 1, username: 'Kamel', role: 'owner' }

const summary: ReportSummary = {
  revenue: 105000,
  depositsCollected: 13500,
  outstanding: 46500,
  salesCount: 2,
  perProduct: [
    { label: 'Lit Sierra Sahara', units: 1, revenue: 60000 },
    { label: 'Matelas Elite 160x190', units: 1, revenue: 45000 },
  ],
}

const mockApi = {
  auth: { status: vi.fn(), setupOwner: vi.fn(), login: vi.fn(), logout: vi.fn(), recoverOwner: vi.fn() },
  products: {
    list: vi.fn().mockResolvedValue([]),
    listFull: vi.fn().mockResolvedValue([]),
    topSellers: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    uploadImage: vi.fn(),
  },
  suppliers: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), setActive: vi.fn() },
  categories: { list: vi.fn().mockResolvedValue([]) },
  sales: { create: vi.fn(), get: vi.fn(), recent: vi.fn(), list: vi.fn().mockResolvedValue([]), addPayment: vi.fn(), setStatus: vi.fn(), cancel: vi.fn() },
  printing: { printReceipt: vi.fn() },
  settings: {
    get: vi.fn().mockResolvedValue({
      id: 1,
      store_name: 'MLM',
      logo_path: null,
      default_deposit_percentages: [30],
      dimension_presets: ['160x190'],
      show_delivery_note: true,
      show_phone_on_receipt: true,
      show_quantity_on_receipt: true,
      updated_at: '',
    }),
    updateReceipt: vi.fn(),
    uploadLogo: vi.fn(),
  },
  reports: {
    summary: vi.fn().mockResolvedValue(summary),
    sales: vi.fn().mockResolvedValue([]),
  },
} as unknown as ElectronAPI

beforeEach(() => {
  vi.clearAllMocks()
  window.electronAPI = mockApi
})

function renderReports() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter>
            <ReportsPage session={ownerSession} />
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>,
  )
}

describe('ReportsPage (ticket 02)', () => {
  it('shows the four KPI cards with live values', async () => {
    renderReports()
    expect(await screen.findByText('105 000 DZD')).toBeInTheDocument()
    expect(screen.getByText('Chiffre d\'affaires')).toBeInTheDocument()
    expect(screen.getByText('13 500 DZD')).toBeInTheDocument()
    expect(screen.getByText('Acomptes collectés')).toBeInTheDocument()
    expect(screen.getByText('46 500 DZD')).toBeInTheDocument()
    expect(screen.getByText('Solde en attente')).toBeInTheDocument()
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Nombre de ventes')).toBeInTheDocument()
  })

  it('renders the top-products breakdown', async () => {
    renderReports()
    expect(await screen.findByText('Lit Sierra Sahara')).toBeInTheDocument()
    expect(screen.getByText('Matelas Elite 160x190')).toBeInTheDocument()
    expect(screen.getAllByText(/60 000 DZD/).length).toBeGreaterThanOrEqual(1)
  })

  it('re-queries when the date range tab changes', async () => {
    renderReports()
    await screen.findByText('105 000 DZD')
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Cette Semaine' }))
    await waitFor(() => expect(mockApi.reports.summary).toHaveBeenCalledTimes(2))
  })

  it('defaults to Aujourd\'hui', async () => {
    renderReports()
    await screen.findByText('105 000 DZD')
    const range = vi.mocked(mockApi.reports.summary).mock.calls[0][0] as { from: string; to: string }
    const from = new Date(range.from)
    const to = new Date(range.to)
    expect(from.getHours()).toBe(0)
    expect(from.getMinutes()).toBe(0)
    expect(to.getTime() - from.getTime()).toBe(86400000)
  })
})
