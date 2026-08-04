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
        image_path: null,
        variants: [
          { id: 10, dimension: '160x190', name: null, price: 45000, out_of_stock: false, low_stock: false, available_low: null, available_above: 3 },
          { id: 11, dimension: '180x200', name: null, price: 55000, out_of_stock: true, low_stock: false, available_low: null, available_above: null },
        ],
      },
      {
        id: 2,
        name: 'Lit Sierra',
        category_id: 1,
        image_path: null,
        variants: [
          { id: 20, dimension: '', name: 'Sahara', price: 80000, out_of_stock: false, low_stock: true, available_low: 2, available_above: null },
          { id: 21, dimension: '', name: 'Blanc', price: 82000, out_of_stock: false, low_stock: false, available_low: null, available_above: 3 },
        ],
      },
    ]),
    listFull: vi.fn().mockResolvedValue([]),
    topSellers: vi.fn().mockResolvedValue([
      { id: 1, name: 'Matelas Elite', image_path: null, units_sold: 6 },
      { id: 2, name: 'Lit Sierra', image_path: null, units_sold: 4 },
    ]),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    uploadImage: vi.fn(),
  },
  suppliers: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), setActive: vi.fn() },
  categories: { list: vi.fn().mockResolvedValue([{ id: 1, name: 'Matelas', sort_order: 0, active: true }]) },
  sales: { create: vi.fn(), get: vi.fn(), recent: vi.fn(), addPayment: vi.fn(), setStatus: vi.fn(), cancel: vi.fn() },
  printing: { printReceipt: vi.fn().mockResolvedValue({ success: true }) },
  settings: {
    get: vi.fn().mockResolvedValue({
      id: 1,
      store_name: 'MLM',
      logo_path: null,
      default_deposit_percentages: [30, 50, 70],
      dimension_presets: ['90x190', '160x190', '180x200'],
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
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 })
  const mql = window.matchMedia
  window.matchMedia = ((query: string) => {
    const matches = query.includes('max-width') ? 1280 < 1150 : false
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
})

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

describe('CounterPage redesign (ticket 02)', () => {
  it('main view shows category tiles', async () => {
    renderCounter()
    expect(await screen.findByRole('button', { name: 'Matelas' })).toBeInTheDocument()
    expect(screen.queryByText('Plus vendus')).not.toBeInTheDocument()
  })

  it('tapping a category shows its product cards', async () => {
    renderCounter()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Matelas' }))
    expect(await screen.findByRole('button', { name: 'Matelas Elite' })).toBeInTheDocument()
    expect(screen.getByText('Lit Sierra')).toBeInTheDocument()
  })

  it('choosing a size in the chooser and OK adds the variant to the cart', async () => {
    renderCounter()
    const user = await addVariant()
    expect(await screen.findByText('160x190')).toBeInTheDocument()
    expect(screen.getAllByText('45 000 DZD').length).toBeGreaterThanOrEqual(1)
    void user
  })

  it('the chooser shows availability wording: Plus que X when low, Rupture at zero', async () => {
    renderCounter()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Matelas' }))
    await user.click(await screen.findByRole('button', { name: 'Lit Sierra' }))
    expect((await screen.findAllByText('Plus que 2')).length).toBeGreaterThanOrEqual(1)
    const pills = [...document.querySelectorAll('[data-slot="availability-pill"]')] as HTMLElement[]
    expect(pills.some((p) => p.textContent === 'Plus que 2')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Fermer' }))
    await user.click(await screen.findByRole('button', { name: 'Matelas Elite' }))
    expect(await screen.findByText('Rupture')).toBeInTheDocument()
    const rupturePills = [...document.querySelectorAll('[data-slot="availability-pill"]')] as HTMLElement[]
    expect(rupturePills.some((p) => p.textContent === 'Rupture')).toBe(true)
  })

  it('shows a near-end banner when a low-stock variant is in the cart', async () => {
    renderCounter()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Matelas' }))
    await user.click(await screen.findByRole('button', { name: 'Lit Sierra' }))
    await user.click(await screen.findByRole('button', { name: /Sahara/ }))
    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(await screen.findByText(/Plus que 2/)).toBeInTheDocument()
  })

  it('search matches a color name', async () => {
    renderCounter()
    const user = userEvent.setup()
    await user.type(await screen.findByPlaceholderText(/Rechercher/), 'sahara')
    expect(await screen.findByRole('button', { name: 'Lit Sierra' })).toBeInTheDocument()
    expect(screen.queryByText('Matelas Elite')).not.toBeInTheDocument()
  })

  it('computes the deposit and remaining balance from a preset', async () => {
    renderCounter()
    const user = await addVariant()
    await user.click(await screen.findByRole('button', { name: /Acompte \(50%\)/ }))
    expect(screen.getAllByText('22 500 DZD').length).toBeGreaterThanOrEqual(2)
  })

  it('shows only the full-height empty cart card with an empty cart', async () => {
    renderCounter()
    await screen.findByRole('button', { name: 'Matelas' })
    expect(screen.getByText('Panier vide')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nom du client')).not.toBeInTheDocument()
    const buttons = [...document.querySelectorAll('button')]
    expect(buttons.some((b) => b.textContent?.trim() === 'Enregistrer')).toBe(false)
  })

  it('reveals the customer form after the first item is added', async () => {
    renderCounter()
    const user = await addVariant()
    expect(await screen.findByLabelText('Nom du client')).toBeInTheDocument()
    expect(screen.queryByText('Panier vide')).not.toBeInTheDocument()
    void user
  })

  it('keeps the cart line and the customer form visible together', async () => {
    renderCounter()
    const user = await addVariant()
    expect(await screen.findByText('160x190')).toBeInTheDocument()
    expect(screen.getByLabelText('Nom du client')).toBeInTheDocument()
    void user
  })

  it('saves the sale then shows the receipt preview and prints; Terminer resets', async () => {
    vi.mocked(mockApi.sales.create).mockResolvedValue(7)
    vi.mocked(mockApi.sales.get).mockResolvedValue(saleFixture)
    renderCounter()
    const user = await addVariant()
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(mockApi.sales.create).toHaveBeenCalledTimes(1))
    expect(screen.getAllByText(/Vente enregistrée/).length).toBeGreaterThanOrEqual(1)
    await user.click(screen.getByRole('button', { name: 'Imprimer' }))
    await waitFor(() => expect(mockApi.printing.printReceipt).toHaveBeenCalledWith(7))
    expect(screen.queryByText('Panier vide')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Terminer la vente' }))
    await waitFor(() => expect(screen.getByText('Panier vide')).toBeInTheDocument())
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
    expect(payload.items).toEqual([
      { productVariantId: 10, quantity: 1, unitPriceAtSale: 0, customDescription: null },
    ])
    expect(payload.payment).toEqual({ amount: 13500, type: 'deposit', enteredAsPercentage: 30 })
    expect(payload.freeDelivery).toBe(false)
  })

  it('toggling Livraison Gratuite sends freeDelivery true on the sale', async () => {
    vi.mocked(mockApi.sales.create).mockResolvedValue(7)
    vi.mocked(mockApi.sales.get).mockResolvedValue(saleFixture)
    renderCounter()
    const user = await addVariant()
    await user.click(await screen.findByLabelText(/Livraison Gratuite/))
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(mockApi.sales.create).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(mockApi.sales.create).mock.calls[0][0] as NewSalePayload
    expect(payload.freeDelivery).toBe(true)
  })

  it('captures wilaya and delivery address on the sale', async () => {
    vi.mocked(mockApi.sales.create).mockResolvedValue(7)
    vi.mocked(mockApi.sales.get).mockResolvedValue(saleFixture)
    renderCounter()
    const user = await addVariant()
    await user.click(await screen.findByLabelText(/Wilaya/))
    await user.click(await screen.findByRole('option', { name: 'Alger' }))
    await user.type(screen.getByLabelText('Adresse de livraison'), 'Rue des Frères, Bab Ezzouar')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(mockApi.sales.create).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(mockApi.sales.create).mock.calls[0][0] as NewSalePayload
    expect(payload.wilaya).toBe('Alger')
    expect(payload.deliveryAddress).toBe('Rue des Frères, Bab Ezzouar')
  })

  it('Enregistrer carries the gold accent', async () => {
    renderCounter()
    const user = await addVariant()
    const buttons = [...document.querySelectorAll('button')]
    const saveButton = buttons.find((b) => b.textContent?.trim() === 'Enregistrer')
    expect(saveButton?.className).toMatch(/bg-accent/)
    void user
  })

  it('custom dimension dialog captures name, dimension, price and note', async () => {
    renderCounter()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Dimension Personnalisée/ }))
    await user.type(screen.getByLabelText('Nom / couleur'), 'Sahara')
    await user.type(screen.getByLabelText('Dimension'), '170x200')
    await user.type(screen.getByLabelText('Prix (DZD)'), '65000')
    await user.type(screen.getByLabelText('Remarque'), 'commande spéciale')
    await user.click(screen.getByRole('button', { name: 'Ajouter au panier' }))
    expect(screen.getByText(/Sahara.*170x200|170x200.*Sahara/)).toBeInTheDocument()
    expect(screen.getByText(/commande spéciale/)).toBeInTheDocument()
    expect(screen.getByText('Personnalisé')).toBeInTheDocument()
  })
})

describe('CounterPage checkout layout and uncategorized products', () => {
  it('keeps the desktop checkout column at full height', async () => {
    renderCounter()
    const column = await screen.findByTestId('checkout-column')
    expect(column.className).toContain('h-full')
    expect(column.className).toContain('min-h-0')
  })

  it('shows an uncategorized tile when products have no category and filters to them', async () => {
    vi.mocked(mockApi.products.list).mockResolvedValue([
      {
        id: 1,
        name: 'Matelas Elite',
        category_id: 1,
        image_path: null,
        variants: [
          { id: 10, dimension: '160x190', name: null, price: 45000, out_of_stock: false, low_stock: false, available_low: null, available_above: 3 },
        ],
      },
      {
        id: 3,
        name: 'Oreiller Solo',
        category_id: null,
        image_path: null,
        variants: [
          { id: 30, dimension: '40x60', name: null, price: 3000, out_of_stock: false, low_stock: false, available_low: null, available_above: 3 },
        ],
      },
    ])
    renderCounter()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Sans catégorie' }))
    expect(screen.getByRole('button', { name: 'Oreiller Solo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Matelas Elite' })).not.toBeInTheDocument()
  })
})
