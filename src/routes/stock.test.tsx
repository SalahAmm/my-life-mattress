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
    created_at: '2026-07-15T10:00:00.000Z',
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
    created_at: '2026-07-20T10:00:00.000Z',
    active: true,
    variants: [
      { id: 20, product_id: 2, dimension: '40x60', price: 3000, sku: null, name: null, quantity_on_hand: 3, low_stock_threshold: 1, out_of_stock: false },
    ],
  },
]

const mockApi = {
  auth: { status: vi.fn(), setupOwner: vi.fn(), login: vi.fn(), logout: vi.fn(), recoverOwner: vi.fn() },
  products: { list: vi.fn().mockResolvedValue([]), listFull: vi.fn().mockResolvedValue(products), create: vi.fn(), update: vi.fn().mockResolvedValue(undefined), deactivate: vi.fn(), uploadImage: vi.fn() },
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
      dimension_presets: ['90x190', '160x190', '180x200'],
      show_delivery_note: true,
      show_phone_on_receipt: true,
      show_quantity_on_receipt: true,
      updated_at: '',
    }),
    updateReceipt: vi.fn().mockResolvedValue(undefined),
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
  it('renders the product added date under the name', async () => {
    renderStock()
    const cell = (await screen.findAllByText('Matelas Elite'))[0].closest('td') as HTMLElement
    expect(within(cell).getByText(/Ajouté le/)).toBeInTheDocument()
  })

  it('shows KPI cards with live variant counts', async () => {
    renderStock()
    expect((await screen.findAllByText('Matelas Elite')).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('En Stock').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Stock Faible').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Rupture').length).toBeGreaterThanOrEqual(1)
  })

  it('clicking the Rupture KPI filters the list to zero-stock variants', async () => {
    renderStock()
    await screen.findAllByText('Matelas Elite')
    const user = userEvent.setup()
    await user.click(screen.getAllByText('Rupture')[0])
    expect(screen.getByText('200x200')).toBeInTheDocument()
    expect(screen.queryByText('160x190')).not.toBeInTheDocument()
  })

  it('renders one row per variant with product, category, supplier and stock columns', async () => {
    renderStock()
    expect((await screen.findAllByText('Matelas Elite')).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Rafik').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Matelas').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('160x190').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('180x200').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('200x200').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Oreiller Confort').length).toBeGreaterThanOrEqual(1)
  })

  it('supplier-less products show a dash in the supplier column', async () => {
    renderStock()
    await screen.findByText('Oreiller Confort')
    const row = screen.getByText('Oreiller Confort').closest('tr') as HTMLElement
    const supplierCell = within(row).getAllByRole('cell').find((cell) => cell.textContent === '—')
    expect(supplierCell).toBeDefined()
  })

  it('sorts by stock quantity when the Stock header is clicked', async () => {
    renderStock()
    await screen.findAllByText('Matelas Elite')
    const user = userEvent.setup()
    await user.click(screen.getByRole('columnheader', { name: /Stock/ }))
    const cells = [...document.querySelectorAll('tbody tr')].map((row) =>
      (row as HTMLElement).querySelectorAll('td')[5]?.textContent?.trim(),
    )
    expect(cells[0]).toMatch(/0/)
    await user.click(screen.getByRole('columnheader', { name: /Stock/ }))
    const descCells = [...document.querySelectorAll('tbody tr')].map((row) =>
      (row as HTMLElement).querySelectorAll('td')[5]?.textContent?.trim(),
    )
    expect(descCells[0]).toMatch(/4/)
  })

  it('sorting by product name orders rows alphabetically', async () => {
    renderStock()
    await screen.findAllByText('Matelas Elite')
    const user = userEvent.setup()
    await user.click(screen.getByRole('columnheader', { name: /Produit/ }))
    const names = [...document.querySelectorAll('tbody tr')].map((row) =>
      (row as HTMLElement).querySelectorAll('td')[1]?.textContent?.trim(),
    )
    expect(names[0]).toContain('Matelas Elite')
    expect(names[names.length - 1]).toContain('Oreiller Confort')
  })

  it('rows expose edit, duplicate and deactivate actions', async () => {
    renderStock()
    await screen.findAllByText('Matelas Elite')
    const row = screen.getByText('160x190').closest('tr') as HTMLElement
    expect(within(row).getByLabelText('Modifier')).toBeInTheDocument()
    expect(within(row).getByLabelText('Dupliquer')).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: /Désactiver/ })).toBeInTheDocument()
  })

  it('removing a supplier asks for confirmation before deactivating', async () => {
    renderStock()
    await screen.findAllByText('Matelas Elite')
    const user = userEvent.setup()
    const chip = screen.getByRole('button', { name: /Rafik/ }).closest('span') as HTMLElement
    await user.click(within(chip).getByLabelText('Supprimer le fournisseur'))
    expect(await screen.findByText('Supprimer ce fournisseur ?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(mockApi.suppliers.setActive).not.toHaveBeenCalled()
    await user.click(within(chip).getByLabelText('Supprimer le fournisseur'))
    await user.click(await screen.findByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(mockApi.suppliers.setActive).toHaveBeenCalledWith({ id: 1, active: false }))
  })

  it('clicking a supplier chip filters to that supplier only', async () => {
    renderStock()
    await screen.findAllByText('Matelas Elite')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Rafik/ }))
    expect(screen.getAllByText('Matelas Elite').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Oreiller Confort')).not.toBeInTheDocument()
    expect(screen.queryByText('Sans fournisseur')).not.toBeInTheDocument()
  })

  it('supplier and category chips combine', async () => {
    renderStock()
    await screen.findAllByText('Matelas Elite')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Rafik/ }))
    await user.click(screen.getByRole('button', { name: /Matelas/ }))
    expect(screen.getAllByText('Matelas Elite').length).toBeGreaterThanOrEqual(1)
  })

  it('clicking a chip again un-toggles it', async () => {
    renderStock()
    await screen.findAllByText('Matelas Elite')
    const user = userEvent.setup()
    const chip = screen.getByRole('button', { name: /Rafik/ })
    await user.click(chip)
    expect(screen.queryByText('Oreiller Confort')).not.toBeInTheDocument()
    await user.click(chip)
    expect(screen.getByText('Oreiller Confort')).toBeInTheDocument()
  })

  it('Tous les fournisseurs resets the supplier row', async () => {
    renderStock()
    await screen.findAllByText('Matelas Elite')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Rafik/ }))
    await user.click(screen.getByRole('button', { name: /Tous les fournisseurs/ }))
    expect(screen.getByText('Oreiller Confort')).toBeInTheDocument()
  })

  it('editing a product pre-fills the form and saves via products:update', async () => {
    renderStock()
    await screen.findAllByText('Matelas Elite')
    const user = userEvent.setup()
    const row = screen.getAllByText('Matelas Elite')[0].closest('tr') as HTMLElement
    await user.click(within(row).getByLabelText('Modifier'))
    expect((await screen.findAllByText('Modifier le produit')).length).toBeGreaterThanOrEqual(1)
    const nameInput = screen.getByLabelText('Nom du produit') as HTMLInputElement
    expect(nameInput.value).toBe('Matelas Elite')
    await user.clear(nameInput)
    await user.type(nameInput, 'Matelas Elite V2')
    await user.click(screen.getByRole('button', { name: 'Enregistrer le produit' }))
    await waitFor(() => expect(mockApi.products.update).toHaveBeenCalled())
    const input = vi.mocked(mockApi.products.update).mock.calls.at(-1)![0] as { id: number; name: string }
    expect(input.id).toBe(1)
    expect(input.name).toBe('Matelas Elite V2')
  })

  it('duplicating a product pre-fills the form and creates a new product with zero stock', async () => {
    renderStock()
    await screen.findAllByText('Matelas Elite')
    const user = userEvent.setup()
    const row = screen.getAllByText('Matelas Elite')[0].closest('tr') as HTMLElement
    await user.click(within(row).getByLabelText('Dupliquer'))
    expect((await screen.findAllByText('Ajouter un produit')).length).toBeGreaterThanOrEqual(1)
    const nameInput = screen.getByLabelText('Nom du produit') as HTMLInputElement
    expect(nameInput.value).toBe('Matelas Elite')
    await user.click(screen.getByRole('button', { name: 'Enregistrer le produit' }))
    await waitFor(() => expect(mockApi.products.create).toHaveBeenCalled())
    const input = vi.mocked(mockApi.products.create).mock.calls.at(-1)![0] as {
      name: string
      variants: { initialStock: number }[]
    }
    expect(input.name).toBe('Matelas Elite')
    expect(input.variants.every((v) => v.initialStock === 0)).toBe(true)
  })

  it('dimension preset chips fill the first empty variant dimension', async () => {
    renderStock()
    await screen.findAllByText('Matelas Elite')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Ajouter un produit/ }))
    await user.click(await screen.findByRole('button', { name: '160x190' }))
    const dimensionInput = screen.getByPlaceholderText('Ex. : 160×190') as HTMLInputElement
    expect(dimensionInput.value).toBe('160x190')
  })

  it('clicking a preset chip when all dimensions are filled adds no row', async () => {
    renderStock()
    await screen.findAllByText('Matelas Elite')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Ajouter un produit/ }))
    const dimensionInput = await screen.findByPlaceholderText('Ex. : 160×190')
    await user.type(dimensionInput, '140x190')
    await user.click(screen.getByRole('button', { name: '160x190' }))
    const inputs = [...document.querySelectorAll('input')].filter(
      (i) => (i as HTMLInputElement).placeholder === 'Ex. : 160×190',
    )
    expect(inputs).toHaveLength(1)
  })
})
