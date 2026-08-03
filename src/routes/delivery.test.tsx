import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ElectronAPI } from '@shared/ipc'
import type { SaleWithDetails, Session } from '@shared/types'
import { DeliveryPage } from './delivery'
import { I18nProvider } from '@/lib/i18n'
import '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'

const ownerSession: Session = { userId: 1, username: 'Kamel', role: 'owner' }
const employeeSession: Session = { userId: 2, username: 'Sofiane', role: 'employee' }

const orderedAlger: SaleWithDetails = {
  id: 1,
  customer_id: 1,
  customer_name: 'Ahmed Benali',
  customer_phone: '0550123456',
  created_by: 1,
  created_by_username: 'Kamel',
  status: 'ordered',
  wilaya: 'Alger',
  delivery_address: 'Rue des Frères',
  free_delivery: false,
  created_at: '2026-08-03T10:00:00.000Z',
  items: [
    {
      id: 1,
      sale_id: 1,
      product_variant_id: 10,
      quantity: 1,
      unit_price_at_sale: 45000,
      custom_description: null,
      product_name: 'Matelas Elite',
      dimension: '160x190',
      variant_name: null,
    },
  ],
  payments: [{ id: 1, sale_id: 1, amount: 13500, type: 'deposit', entered_as_percentage: 30, created_at: '' }],
  total: 45000,
  paid: 13500,
  remaining: 31500,
}

const orderedOran: SaleWithDetails = {
  ...orderedAlger,
  id: 2,
  customer_name: 'Karim Bensalem',
  wilaya: 'Oran',
  delivery_address: 'Haï Emir Abdelkader',
  payments: [],
  paid: 0,
  remaining: 60000,
  total: 60000,
  items: [
    {
      id: 2,
      sale_id: 2,
      product_variant_id: 20,
      quantity: 1,
      unit_price_at_sale: 60000,
      custom_description: null,
      product_name: 'Lit Sierra',
      dimension: '',
      variant_name: 'Sahara',
    },
  ],
}

const deliveredBlida: SaleWithDetails = {
  ...orderedAlger,
  id: 3,
  customer_name: 'Rachid Hamdi',
  wilaya: 'Blida',
  status: 'delivered',
  payments: [{ id: 2, sale_id: 3, amount: 45000, type: 'full', entered_as_percentage: null, created_at: '' }],
  paid: 45000,
  remaining: 0,
}

const paidOrdered: SaleWithDetails = {
  ...orderedAlger,
  id: 4,
  customer_name: 'Sofiane Merbah',
  wilaya: 'Alger',
  payments: [{ id: 3, sale_id: 4, amount: 45000, type: 'full', entered_as_percentage: null, created_at: '' }],
  paid: 45000,
  remaining: 0,
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
  sales: {
    create: vi.fn(),
    get: vi.fn(),
    recent: vi.fn(),
    list: vi.fn().mockResolvedValue([orderedAlger, orderedOran, deliveredBlida, paidOrdered]),
    addPayment: vi.fn().mockResolvedValue(undefined),
    setStatus: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn(),
  },
  printing: { printReceipt: vi.fn(), printInBrowser: vi.fn() },
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
} as unknown as ElectronAPI

beforeEach(() => {
  vi.clearAllMocks()
  window.electronAPI = mockApi
})

function renderDelivery(session: Session) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter>
            <DeliveryPage session={session} />
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>,
  )
}

describe('DeliveryPage (ticket 03)', () => {
  it('shows KPI cards, status tabs and orders grouped by wilaya', async () => {
    renderDelivery(ownerSession)
    const user = userEvent.setup()
    await screen.findByText('Ahmed Benali')
    await user.click(screen.getByRole('tab', { name: 'Toutes' }))
    expect(screen.getAllByText('En attente').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Livré').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('À encaisser').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Alger').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Oran').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Blida').length).toBeGreaterThanOrEqual(1)
  })

  it('hides the À encaisser aggregate for employees', async () => {
    renderDelivery(employeeSession)
    await screen.findByText('Ahmed Benali')
    expect(screen.queryByText('À encaisser')).not.toBeInTheDocument()
    expect(screen.getAllByText('En attente').length).toBeGreaterThanOrEqual(1)
  })

  it('shows items, total, paid and due on each order card', async () => {
    renderDelivery(ownerSession)
    await screen.findByText('Ahmed Benali')
    expect(screen.getAllByText('Matelas Elite 160x190').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('45 000 DZD').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('13 500 DZD').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('31 500 DZD').length).toBeGreaterThanOrEqual(1)
  })

  it('Encaisser le Solde calls addPayment with the remaining amount', async () => {
    renderDelivery(ownerSession)
    const user = userEvent.setup()
    await screen.findByText('Ahmed Benali')
    await user.click(screen.getAllByRole('button', { name: /Encaisser le Solde/ })[0])
    const dialog = await screen.findAllByRole('dialog')
    await user.click(within(dialog[0]).getByRole('button', { name: /Encaisser/ }))
    await waitFor(() => expect(mockApi.sales.addPayment).toHaveBeenCalled())
    const input = vi.mocked(mockApi.sales.addPayment).mock.calls.at(-1)![0] as {
      saleId: number
      amount: number
      type: string
    }
    expect(input.saleId).toBe(1)
    expect(input.amount).toBe(31500)
    expect(input.type).toBe('balance')
  })

  it('Marquer comme Livré on a paid order marks delivered directly', async () => {
    renderDelivery(ownerSession)
    const user = userEvent.setup()
    await screen.findByText('Sofiane Merbah')
    const card = screen.getByText('Sofiane Merbah').closest('div') as HTMLElement
    const cardRoot = card.closest('[data-slot="card"]') as HTMLElement
    await user.click(within(cardRoot).getByRole('button', { name: /Marquer comme Livré/ }))
    const dialog = await screen.findAllByRole('dialog')
    await user.click(within(dialog[0]).getByRole('button', { name: /Livrer/ }))
    await waitFor(() => expect(mockApi.sales.setStatus).toHaveBeenCalledWith({ saleId: 4, status: 'delivered' }))
    expect(mockApi.sales.addPayment).not.toHaveBeenCalled()
  })

  it('Marquer comme Livré with a balance prompts collection first', async () => {
    renderDelivery(ownerSession)
    const user = userEvent.setup()
    await screen.findByText('Ahmed Benali')
    await user.click(screen.getAllByRole('button', { name: /Marquer comme Livré/ })[0])
    const dialog = await screen.findAllByRole('dialog')
    await user.click(within(dialog[0]).getByRole('button', { name: /Encaisser et livrer/ }))
    await waitFor(() => expect(mockApi.sales.addPayment).toHaveBeenCalled())
    await waitFor(() => expect(mockApi.sales.setStatus).toHaveBeenCalledWith({ saleId: 1, status: 'delivered' }))
  })
})
