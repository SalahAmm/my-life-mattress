import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ElectronAPI } from '@shared/ipc'
import type { SaleWithDetails, Session } from '@shared/types'
import { CounterPage } from './counter'
import { I18nProvider } from '@/lib/i18n'
import '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'

const ownerSession: Session = { userId: 1, username: 'Kamel', role: 'owner' }

const mockApi = {
  auth: { status: vi.fn(), setupOwner: vi.fn(), login: vi.fn(), logout: vi.fn(), recoverOwner: vi.fn() },
  products: {
    list: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: 'Matelas Elite',
        category_id: 1,
        image_path: null,
        variants: [
          { id: 10, dimension: '160x190', name: null, price: 45000, out_of_stock: false, low_stock: false, available_low: null, available_above: 3 },
          { id: 11, dimension: '180x200', name: null, price: 55000, out_of_stock: true, low_stock: false, available_low: null, available_above: null },
        ],
      },
    ]),
    listFull: vi.fn().mockResolvedValue([]),
    topSellers: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    uploadImage: vi.fn(),
  },
  suppliers: { list: vi.fn().mockResolvedValue([]), create: vi.fn() },
  categories: { list: vi.fn().mockResolvedValue([{ id: 1, name: 'Matelas', sort_order: 0, active: true }]) },
  sales: { create: vi.fn(), get: vi.fn(), recent: vi.fn(), addPayment: vi.fn(), setStatus: vi.fn(), cancel: vi.fn() },
  printing: { printReceipt: vi.fn().mockResolvedValue({ success: true }), printInBrowser: vi.fn().mockResolvedValue({ success: true }) },
  settings: {
    get: vi.fn().mockResolvedValue({
      id: 1,
      store_name: 'MLM',
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

const saleFixture: SaleWithDetails = {
  id: 7,
  customer_id: 1,
  customer_name: 'Ahmed',
  customer_phone: '0550123456',
  created_by: 1,
  created_by_username: 'Kamel',
  status: 'ordered',
  wilaya: null,
  delivery_address: null,
      free_delivery: false,
  created_at: '2026-08-03T10:00:00.000Z',
  items: [
    {
      id: 1,
      sale_id: 7,
      product_variant_id: 10,
      quantity: 1,
      unit_price_at_sale: 45000,
      custom_description: null,
      product_name: 'Matelas Elite',
      dimension: '160x190',
        variant_name: null,
    },
  ],
  payments: [],
  total: 45000,
  paid: 0,
  remaining: 45000,
}

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
  const mql = window.matchMedia
  window.matchMedia = ((query: string) => {
    const matches = query.includes('max-width') ? width < 1150 : false
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
  setWidth(1280)
})

function renderCounter() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter>
            <CounterPage session={ownerSession} />
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>,
  )
}

async function addVariant() {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Matelas' }))
  await user.click(await screen.findByRole('button', { name: 'Matelas Elite' }))
  await user.click(await screen.findByRole('button', { name: /160x190/ }))
  await user.click(screen.getByRole('button', { name: 'OK' }))
  return user
}

describe('narrow counter (ticket 07)', () => {
  it('desktop mode has no bottom bar', async () => {
    setWidth(1280)
    renderCounter()
    await screen.findByText('Panier vide')
    expect(screen.queryByRole('button', { name: 'Voir le panier' })).not.toBeInTheDocument()
  })

  it('narrow mode shows the sticky bottom bar with count and total', async () => {
    setWidth(800)
    renderCounter()
    const user = await addVariant()
    const bar = screen.getByRole('button', { name: 'Voir le panier' })
    expect(bar).toBeInTheDocument()
    expect(screen.getAllByText('45 000 DZD').length).toBeGreaterThanOrEqual(1)
    void user
  })

  it('opening the bar shows the checkout sheet with the cart', async () => {
    setWidth(800)
    renderCounter()
    const user = await addVariant()
    await user.click(screen.getByRole('button', { name: 'Voir le panier' }))
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Panier').length).toBeGreaterThanOrEqual(1)
  })

  it('completes a full sale from the checkout sheet', async () => {
    vi.mocked(mockApi.sales.create).mockResolvedValue(7)
    vi.mocked(mockApi.sales.get).mockResolvedValue(saleFixture)
    setWidth(800)
    renderCounter()
    const user = await addVariant()
    await user.click(screen.getByRole('button', { name: 'Voir le panier' }))
    const dialog = await screen.findAllByRole('dialog')
    await user.type(within(dialog[0]).getByLabelText('Nom du client'), 'Ahmed')
    await user.click(within(dialog[0]).getByRole('button', { name: /Acompte \(30%\)/ }))
    await user.click(within(dialog[0]).getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(mockApi.sales.create).toHaveBeenCalledTimes(1))
  })

  it('totals in the bar stay LTR', async () => {
    setWidth(800)
    renderCounter()
    await addVariant()
    const total = screen.getAllByText('45 000 DZD').find((el) => el.getAttribute('dir') === 'ltr')
    expect(total).toBeDefined()
  })
})
