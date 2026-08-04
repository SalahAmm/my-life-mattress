import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ElectronAPI } from '@shared/ipc'
import { SettingsPage } from './settings'
import { I18nProvider } from '@/lib/i18n'
import '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'

const mockApi = {
  auth: { status: vi.fn(), setupOwner: vi.fn(), login: vi.fn(), logout: vi.fn(), recoverOwner: vi.fn() },
  products: { list: vi.fn().mockResolvedValue([]), listFull: vi.fn().mockResolvedValue([]), create: vi.fn(), deactivate: vi.fn() },
  suppliers: { list: vi.fn().mockResolvedValue([]), create: vi.fn() },
  categories: { list: vi.fn().mockResolvedValue([]) },
  sales: { create: vi.fn(), get: vi.fn(), recent: vi.fn(), addPayment: vi.fn(), setStatus: vi.fn(), cancel: vi.fn() },
  printing: { printReceipt: vi.fn(), printInBrowser: vi.fn(), printReport: vi.fn(), printReportInBrowser: vi.fn() },
  reports: { summary: vi.fn(), sales: vi.fn() },
  files: { saveCsv: vi.fn() },
  users: {
    list: vi.fn().mockResolvedValue([
      { id: 1, username: 'Kamel', role: 'owner', active: 1, created_at: '' },
      { id: 2, username: 'Salim', role: 'employee', active: 1, created_at: '' },
    ]),
    create: vi.fn().mockResolvedValue({ id: 3, username: 'Nadia', role: 'employee', active: 1, created_at: '' }),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    setActive: vi.fn().mockResolvedValue(undefined),
  },
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
    updateReceipt: vi.fn().mockResolvedValue(undefined),
    uploadLogo: vi.fn(),
  },
} as unknown as ElectronAPI

beforeEach(() => {
  vi.clearAllMocks()
  window.electronAPI = mockApi
})

function renderSettings() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <SettingsPage />
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>,
  )
}

describe('SettingsPage receipt appearance editor', () => {
  it('shows the live receipt preview iframe', async () => {
    renderSettings()
    expect(await screen.findByTitle('Aperçu du reçu')).toBeInTheDocument()
  })

  it('toggling the delivery-note off calls updateReceipt with showDeliveryNote false', async () => {
    renderSettings()
    const user = userEvent.setup()
    await screen.findByTitle('Aperçu du reçu')
    const checkbox = screen.getByLabelText(/Ligne « Livraison Gratuite »/)
    await user.click(checkbox)
    await waitFor(() => expect(mockApi.settings.updateReceipt).toHaveBeenCalled())
    const input = vi.mocked(mockApi.settings.updateReceipt).mock.calls.at(-1)![0] as {
      showDeliveryNote: boolean
    }
    expect(input.showDeliveryNote).toBe(false)
  })

  it('toggling the phone off persists showPhoneOnReceipt false', async () => {
    renderSettings()
    const user = userEvent.setup()
    await screen.findByTitle('Aperçu du reçu')
    await user.click(screen.getByLabelText(/Téléphone du client/))
    await waitFor(() => expect(mockApi.settings.updateReceipt).toHaveBeenCalled())
    const input = vi.mocked(mockApi.settings.updateReceipt).mock.calls.at(-1)![0] as {
      showPhoneOnReceipt: boolean
      showQuantityOnReceipt: boolean
      showDeliveryNote: boolean
    }
    expect(input.showPhoneOnReceipt).toBe(false)
    expect(input.showDeliveryNote).toBe(true)
  })

  it('toggling the quantities off persists showQuantityOnReceipt false', async () => {
    renderSettings()
    const user = userEvent.setup()
    await screen.findByTitle('Aperçu du reçu')
    await user.click(screen.getByLabelText(/Quantités/))
    await waitFor(() => expect(mockApi.settings.updateReceipt).toHaveBeenCalled())
    const input = vi.mocked(mockApi.settings.updateReceipt).mock.calls.at(-1)![0] as {
      showQuantityOnReceipt: boolean
    }
    expect(input.showQuantityOnReceipt).toBe(false)
  })

  it('uploading a logo calls uploadLogo', async () => {
    vi.mocked(mockApi.settings.uploadLogo).mockResolvedValue('C:/logos/logo.png')
    renderSettings()
    const user = userEvent.setup()
    await screen.findByTitle('Aperçu du reçu')
    await user.click(screen.getByRole('button', { name: /Téléverser le logo/ }))
    await waitFor(() => expect(mockApi.settings.uploadLogo).toHaveBeenCalled())
  })

  it('renders all seven tabs; Reçu, Produits & Catégories and Utilisateurs enabled', async () => {
    renderSettings()
    await screen.findByTitle('Aperçu du reçu')
    for (const tab of ['Général', 'Produits & Catégories', 'Paiement', 'Reçu', 'Imprimante', 'Utilisateurs', 'Données']) {
      const trigger = screen.getByRole('tab', { name: tab })
      expect(trigger).toBeInTheDocument()
      if (tab === 'Général' || tab === 'Paiement' || tab === 'Imprimante' || tab === 'Données') {
        expect(trigger).toHaveAttribute('data-disabled')
      }
    }
  })
})

describe('SettingsPage users tab (ticket 01)', () => {
  it('lists users with role badges', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Utilisateurs' }))
    expect(await screen.findByText('Kamel')).toBeInTheDocument()
    expect(screen.getByText('Salim')).toBeInTheDocument()
    expect(screen.getByText('Propriétaire')).toBeInTheDocument()
    expect(screen.getByText('Employé')).toBeInTheDocument()
  })

  it('creates an employee account', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Utilisateurs' }))
    await user.click(await screen.findByRole('button', { name: /Ajouter un utilisateur/ }))
    await user.type(screen.getByLabelText(/Nom d'utilisateur/), 'Nadia')
    await user.type(screen.getByLabelText(/Mot de passe/), 'nadia123')
    await user.click(screen.getByRole('button', { name: 'Créer le compte' }))
    await waitFor(() => expect(mockApi.users.create).toHaveBeenCalled())
    const input = vi.mocked(mockApi.users.create).mock.calls.at(-1)![0] as { username: string; password: string }
    expect(input).toEqual({ username: 'Nadia', password: 'nadia123' })
  })

  it('resets an employee password', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Utilisateurs' }))
    const salimRow = await screen.findByRole('row', { name: /Salim/ })
    await user.click(within(salimRow).getByRole('button', { name: /Réinitialiser/ }))
    await user.type(screen.getByLabelText(/Nouveau mot de passe/), 'salim789')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(mockApi.users.resetPassword).toHaveBeenCalled())
    const input = vi.mocked(mockApi.users.resetPassword).mock.calls.at(-1)![0] as { id: number; password: string }
    expect(input).toEqual({ id: 2, password: 'salim789' })
  })

  it('deactivates an employee', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Utilisateurs' }))
    const salimRow = await screen.findByRole('row', { name: /Salim/ })
    await user.click(within(salimRow).getByRole('button', { name: /Désactiver/ }))
    await waitFor(() => expect(mockApi.users.setActive).toHaveBeenCalled())
    expect(vi.mocked(mockApi.users.setActive).mock.calls.at(-1)![0]).toEqual({ id: 2, active: false })
  })

  it('hides the deactivate action for the owner account', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Utilisateurs' }))
    const kamelRow = await screen.findByRole('row', { name: /Kamel/ })
    expect(within(kamelRow).queryByRole('button', { name: /Désactiver/ })).not.toBeInTheDocument()
    expect(within(kamelRow).queryByRole('button', { name: /Activer/ })).not.toBeInTheDocument()
  })
})
