import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ElectronAPI } from '@shared/ipc'
import type { ProductWithVariants } from '@shared/types'
import { StockPage } from './stock'
import { I18nProvider } from '@/lib/i18n'
import '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'

const products: ProductWithVariants[] = [
  {
    id: 1,
    name: 'Matelas Elite',
    category_id: 1,
    category_name: 'Matelas',
    supplier_id: 1,
    supplier_name: 'Rafik',
    image_path: null,
    active: true,
    variants: [
      { id: 10, product_id: 1, dimension: '160x190', price: 45000, sku: null, name: null, quantity_on_hand: 4, low_stock_threshold: 2, out_of_stock: false },
      { id: 11, product_id: 1, dimension: '180x200', price: 55000, sku: null, name: null, quantity_on_hand: 1, low_stock_threshold: 2, out_of_stock: false },
      { id: 12, product_id: 1, dimension: '200x200', price: 65000, sku: null, name: null, quantity_on_hand: 0, low_stock_threshold: 1, out_of_stock: true },
    ],
  },
  {
    id: 2,
    name: 'Oreiller Confort',
    category_id: null,
    category_name: null,
    supplier_id: null,
    supplier_name: null,
    image_path: null,
    active: true,
    variants: [
      { id: 20, product_id: 2, dimension: '40x60', price: 3000, sku: null, name: null, quantity_on_hand: 3, low_stock_threshold: 1, out_of_stock: false },
    ],
  },
]

const mockApi = {
  auth: { status: vi.fn(), setupOwner: vi.fn(), login: vi.fn(), logout: vi.fn(), recoverOwner: vi.fn() },
  products: { list: vi.fn().mockResolvedValue([]), listFull: vi.fn().mockResolvedValue(products), create: vi.fn(), deactivate: vi.fn() },
  suppliers: {
    list: vi.fn().mockResolvedValue([{ id: 1, name: 'Rafik', phone: null, active: true, created_at: '' }]),
    create: vi.fn().mockResolvedValue(2),
    setActive: vi.fn().mockResolvedValue(undefined),
  },
  categories: { list: vi.fn().mockResolvedValue([{ id: 1, name: 'Matelas', sort_order: 0, active: true }]) },
  sales: { create: vi.fn(), get: vi.fn(), recent: vi.fn(), addPayment: vi.fn(), setStatus: vi.fn(), cancel: vi.fn() },
  printing: { printReceipt: vi.fn(), printInBrowser: vi.fn() },
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
  window.electronAPI = mockApi
})

function renderStock() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter>
            <StockPage />
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>,
  )
}

describe('StockPage (ticket 08)', () => {
  it('shows KPI cards with live variant counts', async () => {
    renderStock()
    expect(await screen.findByText('Rafik')).toBeInTheDocument()
    expect(screen.getAllByText('En Stock').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Stock Faible').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Rupture').length).toBeGreaterThanOrEqual(1)
  })

  it('clicking the Rupture KPI filters the list to zero-stock variants', async () => {
    renderStock()
    await screen.findByText('Rafik')
    const user = userEvent.setup()
    await user.click(screen.getAllByText('Rupture')[0])
    expect(screen.getByText('200x200')).toBeInTheDocument()
    expect(screen.queryByText('160x190')).not.toBeInTheDocument()
  })

  it('groups products under supplier headers with category badges', async () => {
    renderStock()
    await screen.findByText('Rafik')
    expect(screen.getByText('Matelas Elite')).toBeInTheDocument()
    expect(screen.getByText('Matelas')).toBeInTheDocument()
  })

  it('places supplier-less products in the Sans fournisseur group', async () => {
    renderStock()
    expect(await screen.findByText('Sans fournisseur')).toBeInTheDocument()
    expect(screen.getByText('Oreiller Confort')).toBeInTheDocument()
  })

  it('removing a supplier calls the owner-only setActive IPC', async () => {
    renderStock()
    await screen.findByText('Rafik')
    const user = userEvent.setup()
    const group = screen.getByText('Rafik').closest('div') as HTMLElement
    const removeButton = within(group).getByLabelText('Supprimer le fournisseur')
    await user.click(removeButton)
    await user.click(await screen.findByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(mockApi.suppliers.setActive).toHaveBeenCalledWith({ id: 1, active: false }))
  })

  it('supplier-less group header exists alongside supplier groups', async () => {
    renderStock()
    expect(await screen.findByText('Rafik')).toBeInTheDocument()
    expect(screen.getByText('Sans fournisseur')).toBeInTheDocument()
  })
})
