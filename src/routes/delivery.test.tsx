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

const deliveredOld: SaleWithDetails = {
  ...deliveredBlida,
  id: 5,
  customer_name: 'Ancienne Livraison',
  wilaya: 'Sétif',
  created_at: '2026-01-15T10:00:00.000Z',
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
    list: vi.fn().mockResolvedValue([orderedAlger, orderedOran, deliveredBlida, paidOrdered, deliveredOld]),
    addPayment: vi.fn().mockResolvedValue(undefined),
    setStatus: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    clearDelivered: vi.fn().mockResolvedValue(2),
  },
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
      employees_see_delivered: false,
      employees_can_collect_deliver: true,
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

describe('DeliveryPage redesign', () => {
  it('shows a large SOLDE DÛ hero with the remaining amount on unpaid orders', async () => {
    renderDelivery(ownerSession)
    const card = (await screen.findByText('Ahmed Benali')).closest('[data-slot="card"]') as HTMLElement
    const hero = within(card).getByText('31 500 DZD')
    expect(hero.className).toMatch(/text-destructive|text-2xl|text-3xl/)
    expect(within(card).getByText(/Solde dû/)).toBeInTheDocument()
  })

  it('shows a green paid state on fully paid orders', async () => {
    renderDelivery(ownerSession)
    const card = (await screen.findByText('Sofiane Merbah')).closest('[data-slot="card"]') as HTMLElement
    const hero = within(card).getByText('0 DZD')
    expect(hero.className).toMatch(/text-success/)
  })

  it('shows one action button: Encaisser et livrer on unpaid orders', async () => {
    renderDelivery(ownerSession)
    await screen.findByText('Ahmed Benali')
    expect(screen.getAllByRole('button', { name: /Encaisser et livrer/ }).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole('button', { name: /Encaisser le Solde/ })).not.toBeInTheDocument()
  })

  it('shows Marquer comme livré on paid orders', async () => {
    renderDelivery(ownerSession)
    await screen.findByText('Sofiane Merbah')
    expect(screen.getAllByRole('button', { name: /Marquer comme livré/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('Encaisser et livrer collects the balance then marks delivered', async () => {
    renderDelivery(ownerSession)
    const user = userEvent.setup()
    await screen.findByText('Ahmed Benali')
    await user.click(screen.getAllByRole('button', { name: /Encaisser et livrer/ })[0])
    const dialog = await screen.findAllByRole('dialog')
    await user.click(within(dialog[0]).getByRole('button', { name: /Encaisser et livrer/ }))
    await waitFor(() => expect(mockApi.sales.addPayment).toHaveBeenCalled())
    const payment = vi.mocked(mockApi.sales.addPayment).mock.calls.at(-1)![0] as { saleId: number; amount: number }
    expect(payment.saleId).toBe(1)
    expect(payment.amount).toBe(31500)
    await waitFor(() => expect(mockApi.sales.setStatus).toHaveBeenCalledWith({ saleId: 1, status: 'delivered' }))
  })

  it('Marquer comme livré on a paid order skips payment', async () => {
    renderDelivery(ownerSession)
    const user = userEvent.setup()
    await screen.findByText('Sofiane Merbah')
    const card = screen.getByText('Sofiane Merbah').closest('[data-slot="card"]') as HTMLElement
    await user.click(within(card).getByRole('button', { name: /Marquer comme livré/i }))
    const dialog = await screen.findAllByRole('dialog')
    await user.click(within(dialog[0]).getByRole('button', { name: /Livrer/ }))
    await waitFor(() => expect(mockApi.sales.setStatus).toHaveBeenCalledWith({ saleId: 4, status: 'delivered' }))
    expect(mockApi.sales.addPayment).not.toHaveBeenCalled()
  })

  it('hides the À encaisser aggregate for employees', async () => {
    renderDelivery(employeeSession)
    await screen.findByText('Ahmed Benali')
    expect(screen.queryByText('À encaisser')).not.toBeInTheDocument()
  })

  it('has no "all" tab anymore', async () => {
    renderDelivery(ownerSession)
    await screen.findByText('Ahmed Benali')
    expect(screen.queryByRole('tab', { name: /Toutes/ })).not.toBeInTheDocument()
  })
})

describe('DeliveryPage delivered history', () => {
  async function openHistory(session: Session) {
    renderDelivery(session)
    const user = userEvent.setup()
    await screen.findByText('Ahmed Benali')
    await user.click(screen.getByRole('tab', { name: 'Livré' }))
    return user
  }

  it('shows the history header with filters and the delivered order', async () => {
    await openHistory(ownerSession)
    expect(await screen.findByText('Historique des livraisons')).toBeInTheDocument()
    expect(screen.getByText('Rachid Hamdi')).toBeInTheDocument()
    for (const chip of ['Aujourd\'hui', 'Cette Semaine', 'Ce Mois', 'Toute la période']) {
      expect(screen.getByRole('button', { name: chip })).toBeInTheDocument()
    }
  })

  it('filters by period; old deliveries only appear on Toute la période', async () => {
    const user = await openHistory(ownerSession)
    expect(await screen.findByText('Rachid Hamdi')).toBeInTheDocument()
    expect(screen.queryByText('Ancienne Livraison')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Toute la période' }))
    expect(screen.getByText('Ancienne Livraison')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cette Semaine' }))
    expect(screen.queryByText('Ancienne Livraison')).not.toBeInTheDocument()
  })

  it('collapses the list while keeping the filters', async () => {
    const user = await openHistory(ownerSession)
    await screen.findByText('Rachid Hamdi')
    await user.click(screen.getByRole('button', { name: /Historique des livraisons/ }))
    expect(screen.queryByText('Rachid Hamdi')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toute la période' })).toBeInTheDocument()
  })

  it('deletes a delivered order after confirmation', async () => {
    const user = await openHistory(ownerSession)
    await screen.findByText('Rachid Hamdi')
    const card = screen.getByText('Rachid Hamdi').closest('[data-slot="card"]') as HTMLElement
    await user.click(within(card).getByRole('button', { name: /Supprimer/ }))
    await user.click(screen.getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(mockApi.sales.delete).toHaveBeenCalledWith(3))
  })

  it('clears the whole history after confirmation', async () => {
    const user = await openHistory(ownerSession)
    await screen.findByText('Rachid Hamdi')
    await user.click(screen.getByRole('button', { name: /Tout effacer/ }))
    await user.click(screen.getByRole('button', { name: /Tout effacer/ }))
    await waitFor(() => expect(mockApi.sales.clearDelivered).toHaveBeenCalled())
  })

  it('hides delete and clear actions for employees with history access', async () => {
    vi.mocked(mockApi.settings.get).mockResolvedValue({
      id: 1,
      store_name: 'MLM',
      logo_path: null,
      default_deposit_percentages: [30],
      dimension_presets: ['160x190'],
      show_delivery_note: true,
      show_phone_on_receipt: true,
      show_quantity_on_receipt: true,
      employees_see_delivered: true,
      updated_at: '',
    })
    const user = await openHistory(employeeSession)
    await screen.findByText('Rachid Hamdi')
    expect(screen.queryByRole('button', { name: /Supprimer/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Tout effacer/ })).not.toBeInTheDocument()
    void user
  })
})

describe('DeliveryPage employee visibility', () => {
  it('hides the Livré tab, KPI and history from employees by default', async () => {
    vi.mocked(mockApi.settings.get).mockResolvedValue({
      id: 1,
      store_name: 'MLM',
      logo_path: null,
      default_deposit_percentages: [30],
      dimension_presets: ['160x190'],
      show_delivery_note: true,
      show_phone_on_receipt: true,
      show_quantity_on_receipt: true,
      employees_see_delivered: false,
      updated_at: '',
    })
    renderDelivery(employeeSession)
    await screen.findByText('Ahmed Benali')
    expect(screen.queryByRole('tab', { name: 'Livré' })).not.toBeInTheDocument()
    expect(screen.queryByText('Livré')).not.toBeInTheDocument()
    expect(screen.queryByText('Rachid Hamdi')).not.toBeInTheDocument()
  })

  it('keeps the Livré tab for the owner regardless of the setting', async () => {
    renderDelivery(ownerSession)
    expect(await screen.findByRole('tab', { name: 'Livré' })).toBeInTheDocument()
  })

  it('shows the Livré tab and history to employees when the owner allows it', async () => {
    vi.mocked(mockApi.settings.get).mockResolvedValue({
      id: 1,
      store_name: 'MLM',
      logo_path: null,
      default_deposit_percentages: [30],
      dimension_presets: ['160x190'],
      show_delivery_note: true,
      show_phone_on_receipt: true,
      show_quantity_on_receipt: true,
      employees_see_delivered: true,
      employees_can_collect_deliver: true,
      updated_at: '',
    })
    renderDelivery(employeeSession)
    expect(await screen.findByRole('tab', { name: 'Livré' })).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Livré' }))
    expect(await screen.findByText('Rachid Hamdi')).toBeInTheDocument()
  })
})

describe('DeliveryPage collect-and-deliver access', () => {
  it('hides every deliver action for employees when the owner restricts it', async () => {
    vi.mocked(mockApi.settings.get).mockResolvedValue({
      id: 1,
      store_name: 'MLM',
      logo_path: null,
      default_deposit_percentages: [30],
      dimension_presets: ['160x190'],
      show_delivery_note: true,
      show_phone_on_receipt: true,
      show_quantity_on_receipt: true,
      employees_see_delivered: false,
      employees_can_collect_deliver: false,
      updated_at: '',
    })
    renderDelivery(employeeSession)
    await screen.findByText('Ahmed Benali')
    expect(screen.queryByRole('button', { name: /Encaisser et livrer/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Marquer comme livré/i })).not.toBeInTheDocument()
  })

  it('keeps the deliver action for employees by default', async () => {
    vi.mocked(mockApi.settings.get).mockResolvedValue({
      id: 1,
      store_name: 'MLM',
      logo_path: null,
      default_deposit_percentages: [30],
      dimension_presets: ['160x190'],
      show_delivery_note: true,
      show_phone_on_receipt: true,
      show_quantity_on_receipt: true,
      employees_see_delivered: false,
      employees_can_collect_deliver: true,
      updated_at: '',
    })
    renderDelivery(employeeSession)
    await screen.findByText('Ahmed Benali')
    expect(screen.getAllByRole('button', { name: /Encaisser et livrer/ }).length).toBeGreaterThanOrEqual(1)
  })

  it('always shows the deliver action for the owner', async () => {
    vi.mocked(mockApi.settings.get).mockResolvedValue({
      id: 1,
      store_name: 'MLM',
      logo_path: null,
      default_deposit_percentages: [30],
      dimension_presets: ['160x190'],
      show_delivery_note: true,
      show_phone_on_receipt: true,
      show_quantity_on_receipt: true,
      employees_see_delivered: false,
      employees_can_collect_deliver: false,
      updated_at: '',
    })
    renderDelivery(ownerSession)
    await screen.findByText('Ahmed Benali')
    expect(screen.getAllByRole('button', { name: /Encaisser et livrer/ }).length).toBeGreaterThanOrEqual(1)
  })
})
