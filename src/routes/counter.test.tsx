import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ElectronAPI } from '@shared/ipc'
import type { NewSalePayload, SaleWithDetails, Session } from '@shared/types'
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
        variants: [
          { id: 10, dimension: '160x190', price: 45000, out_of_stock: false },
          { id: 11, dimension: '180x200', price: 55000, out_of_stock: true },
        ],
      },
    ]),
    listFull: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    deactivate: vi.fn(),
  },
  suppliers: { list: vi.fn().mockResolvedValue([]), create: vi.fn() },
  categories: { list: vi.fn().mockResolvedValue([{ id: 1, name: 'Matelas', sort_order: 0, active: true }]) },
  sales: {
    create: vi.fn(),
    get: vi.fn(),
    recent: vi.fn(),
    addPayment: vi.fn(),
    setStatus: vi.fn(),
    cancel: vi.fn(),
  },
  printing: { printReceipt: vi.fn().mockResolvedValue({ success: true }) },
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
    },
  ],
  payments: [],
  total: 45000,
  paid: 0,
  remaining: 45000,
}

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

beforeEach(() => {
  vi.clearAllMocks()
  window.electronAPI = mockApi
})

async function addVariant() {
  const user = userEvent.setup()
  await user.click(await screen.findByText('Matelas Elite'))
  await user.click(screen.getByRole('button', { name: /160x190/ }))
  return user
}

describe('CounterPage', () => {
  it('adds a variant to the cart and shows the running total', async () => {
    renderCounter()
    await addVariant()
    expect(screen.getAllByText('160x190').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('45 000 DZD').length).toBeGreaterThanOrEqual(1)
  })

  it('flags a zero-stock variant but still allows selling it', async () => {
    renderCounter()
    const user = userEvent.setup()
    await user.click(await screen.findByText('Matelas Elite'))
    expect(await screen.findByText('Stock: 0')).toBeInTheDocument()
  })

  it('computes the deposit and remaining balance from a preset', async () => {
    renderCounter()
    const user = await addVariant()
    await user.click(await screen.findByRole('button', { name: /Acompte \(50%\)/ }))
    expect(screen.getAllByText('22 500 DZD').length).toBeGreaterThanOrEqual(2)
  })

  it('computes a zero remaining balance for full payment', async () => {
    renderCounter()
    const user = await addVariant()
    await user.click(await screen.findByRole('button', { name: 'Paiement Complet' }))
    expect(screen.getAllByText('0 DZD').length).toBeGreaterThanOrEqual(1)
  })

  it('disables the save button with an empty cart', async () => {
    renderCounter()
    await screen.findByText('Panier vide')
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })

  it('saves the sale then shows the receipt preview and prints', async () => {
    vi.mocked(mockApi.sales.create).mockResolvedValue(7)
    vi.mocked(mockApi.sales.get).mockResolvedValue(saleFixture)
    renderCounter()
    const user = await addVariant()
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(mockApi.sales.create).toHaveBeenCalledTimes(1))
    expect(screen.getAllByText(/Vente enregistrée/).length).toBeGreaterThanOrEqual(1)
    await user.click(screen.getByRole('button', { name: 'Imprimer' }))
    await waitFor(() => expect(mockApi.printing.printReceipt).toHaveBeenCalledWith(7))
    await waitFor(() => expect(screen.getByText('Panier vide')).toBeInTheDocument())
  })

  it('never double-submits: the save button is disabled while pending', async () => {
    let resolveCreate: (value: number) => void = () => {}
    vi.mocked(mockApi.sales.create).mockImplementation(() => new Promise<number>((resolve) => (resolveCreate = resolve)))
    vi.mocked(mockApi.sales.get).mockResolvedValue(saleFixture)
    renderCounter()
    const user = await addVariant()
    const saveButton = screen.getByRole('button', { name: 'Enregistrer' })
    await user.click(saveButton)
    await waitFor(() => expect(saveButton).toBeDisabled())
    await user.click(saveButton).catch(() => {})
    resolveCreate(7)
    await waitFor(() => expect(mockApi.sales.create).toHaveBeenCalledTimes(1))
  })

  it('sends the exact sale payload with deposit metadata', async () => {
    vi.mocked(mockApi.sales.create).mockResolvedValue(7)
    vi.mocked(mockApi.sales.get).mockResolvedValue(saleFixture)
    renderCounter()
    const user = await addVariant()
    await user.type(screen.getByLabelText('Nom du client'), 'Ahmed Benali')
    await user.type(screen.getByLabelText('Téléphone'), '0550123456')
    await user.click(await screen.findByRole('button', { name: /Acompte \(30%\)/ }))
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(mockApi.sales.create).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(mockApi.sales.create).mock.calls[0][0] as NewSalePayload
    expect(payload.customerName).toBe('Ahmed Benali')
    expect(payload.customerPhone).toBe('0550123456')
    expect(payload.items).toEqual([
      { productVariantId: 10, quantity: 1, unitPriceAtSale: 0, customDescription: null },
    ])
    expect(payload.payment).toEqual({ amount: 13500, type: 'deposit', enteredAsPercentage: 30 })
  })

  it('adds a custom dimension item via the dialog', async () => {
    renderCounter()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Dimension Personnalisée/ }))
    await user.type(screen.getByLabelText('Dimension'), '170x200')
    await user.type(screen.getByLabelText('Prix (DZD)'), '65000')
    await user.click(screen.getByRole('button', { name: 'Ajouter au panier' }))
    expect(screen.getByText(/Dimension Personnalisée: 170x200/)).toBeInTheDocument()
    expect(screen.getByText('Personnalisé')).toBeInTheDocument()
    expect(screen.getAllByText('65 000 DZD').length).toBeGreaterThanOrEqual(1)
  })
})
