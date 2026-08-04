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
  categories: {
    list: vi.fn().mockResolvedValue([]),
    listAll: vi.fn().mockResolvedValue([
      { id: 1, name: 'Matelas', sort_order: 0, active: true },
      { id: 2, name: 'Sommier', sort_order: 1, active: false },
    ]),
    create: vi.fn().mockResolvedValue(3),
    rename: vi.fn().mockResolvedValue(undefined),
    setActive: vi.fn().mockResolvedValue(undefined),
  },
  sales: { create: vi.fn(), get: vi.fn(), recent: vi.fn(), addPayment: vi.fn(), setStatus: vi.fn(), cancel: vi.fn() },
  printing: {
    printReceipt: vi.fn(),
    testPrint: vi.fn().mockResolvedValue({ success: true }),
    printReport: vi.fn(),
  },
  reports: { summary: vi.fn(), sales: vi.fn() },
  files: { saveCsv: vi.fn(), backupDatabase: vi.fn(), restoreDatabase: vi.fn() },
  data: { deleteAll: vi.fn().mockResolvedValue(undefined) },
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

  it('renders all seven enabled tabs', async () => {
    renderSettings()
    await screen.findByTitle('Aperçu du reçu')
    for (const tab of ['Général', 'Produits & Catégories', 'Paiement', 'Reçu', 'Imprimante', 'Utilisateurs', 'Données']) {
      const trigger = screen.getByRole('tab', { name: tab })
      expect(trigger).toBeInTheDocument()
      expect(trigger).not.toHaveAttribute('data-disabled')
    }
  })
})

describe('SettingsPage general tab', () => {
  it('saves the store name', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Général' }))
    const input = await screen.findByLabelText(/Nom du magasin/)
    await user.clear(input)
    await user.type(input, 'My Life Mattress Alger')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(mockApi.settings.updateReceipt).toHaveBeenCalled())
    const call = vi.mocked(mockApi.settings.updateReceipt).mock.calls.at(-1)![0] as { storeName: string }
    expect(call.storeName).toBe('My Life Mattress Alger')
  })

  it('enables employee delivery history via the toggle', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Général' }))
    await user.click(await screen.findByRole('checkbox', { name: /Les employés peuvent voir l'historique des livraisons/ }))
    await waitFor(() => expect(mockApi.settings.updateReceipt).toHaveBeenCalled())
    const call = vi.mocked(mockApi.settings.updateReceipt).mock.calls.at(-1)![0] as {
      employeesSeeDelivered: boolean
    }
    expect(call.employeesSeeDelivered).toBe(true)
  })

  it('restricts employee collect-and-deliver via the toggle', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Général' }))
    await user.click(await screen.findByRole('checkbox', { name: /Les employés peuvent encaisser et livrer/ }))
    await waitFor(() => expect(mockApi.settings.updateReceipt).toHaveBeenCalled())
    const call = vi.mocked(mockApi.settings.updateReceipt).mock.calls.at(-1)![0] as {
      employeesCanCollectDeliver: boolean
    }
    expect(call.employeesCanCollectDeliver).toBe(false)
  })
})

describe('SettingsPage payment tab', () => {
  it('adds a deposit percentage preset', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Paiement' }))
    const input = await screen.findByPlaceholderText('Ex. : 50')
    await user.type(input, '25')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(mockApi.settings.updateReceipt).toHaveBeenCalled())
    const call = vi.mocked(mockApi.settings.updateReceipt).mock.calls.at(-1)![0] as {
      defaultDepositPercentages: number[]
    }
    expect(call.defaultDepositPercentages).toEqual([25, 30, 50, 70])
  })

  it('removes a deposit percentage preset', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Paiement' }))
    await user.click(await screen.findByRole('button', { name: /Supprimer 50%/ }))
    await waitFor(() => expect(mockApi.settings.updateReceipt).toHaveBeenCalled())
    const call = vi.mocked(mockApi.settings.updateReceipt).mock.calls.at(-1)![0] as {
      defaultDepositPercentages: number[]
    }
    expect(call.defaultDepositPercentages).toEqual([30, 70])
  })
})

describe('SettingsPage printer tab', () => {
  it('sends a test print', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Imprimante' }))
    await user.click(await screen.findByRole('button', { name: /Imprimer un reçu test/ }))
    await waitFor(() => expect(mockApi.printing.testPrint).toHaveBeenCalled())
  })
})

describe('SettingsPage receipt format', () => {
  it('saves the width preset 58 mm', async () => {
    renderSettings()
    const user = userEvent.setup()
    await screen.findByTitle('Aperçu du reçu')
    await user.click(screen.getByRole('button', { name: '58 mm' }))
    await waitFor(() => expect(mockApi.settings.updateReceipt).toHaveBeenCalled())
    const call = vi.mocked(mockApi.settings.updateReceipt).mock.calls.at(-1)![0] as {
      receiptWidthMm: number
    }
    expect(call.receiptWidthMm).toBe(58)
  })

  it('saves the Grand font size as scale 1.2', async () => {
    renderSettings()
    const user = userEvent.setup()
    await screen.findByTitle('Aperçu du reçu')
    await user.click(screen.getByRole('button', { name: 'Grand' }))
    await waitFor(() => expect(mockApi.settings.updateReceipt).toHaveBeenCalled())
    const call = vi.mocked(mockApi.settings.updateReceipt).mock.calls.at(-1)![0] as {
      receiptFontScale: number
    }
    expect(call.receiptFontScale).toBe(1.2)
  })

  it('enables a fixed height via the checkbox', async () => {
    renderSettings()
    const user = userEvent.setup()
    await screen.findByTitle('Aperçu du reçu')
    await user.click(screen.getByRole('checkbox', { name: /Hauteur fixe/ }))
    await waitFor(() => expect(mockApi.settings.updateReceipt).toHaveBeenCalled())
    const call = vi.mocked(mockApi.settings.updateReceipt).mock.calls.at(-1)![0] as {
      receiptHeightMm: number | null
    }
    expect(call.receiptHeightMm).toBe(300)
  })
})

describe('SettingsPage categories', () => {
  it('lists active and inactive categories with status badges', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Produits & Catégories' }))
    expect(await screen.findByText('Matelas')).toBeInTheDocument()
    expect(screen.getByText('Sommier')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Désactivé')).toBeInTheDocument()
    void user
  })

  it('creates a category', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Produits & Catégories' }))
    const input = await screen.findByPlaceholderText('Ex. : Oreillers')
    await user.type(input, 'Oreillers')
    await user.click(screen.getByRole('button', { name: 'Ajouter' }))
    await waitFor(() => expect(mockApi.categories.create).toHaveBeenCalledWith({ name: 'Oreillers' }))
  })

  it('renames a category inline', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Produits & Catégories' }))
    const matelasRow = await screen.findByRole('row', { name: /Matelas/ })
    await user.click(within(matelasRow).getByRole('button', { name: /Renommer/ }))
    const editInput = within(matelasRow).getByRole('textbox')
    await user.clear(editInput)
    await user.type(editInput, 'Matelas Premium')
    await user.click(within(matelasRow).getByRole('button', { name: /Enregistrer/ }))
    await waitFor(() => expect(mockApi.categories.rename).toHaveBeenCalledWith({ id: 1, name: 'Matelas Premium' }))
  })

  it('deactivates a category after confirmation', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Produits & Catégories' }))
    const matelasRow = await screen.findByRole('row', { name: /Matelas/ })
    await user.click(within(matelasRow).getByRole('button', { name: /Retirer/ }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /Retirer/ }))
    await waitFor(() => expect(mockApi.categories.setActive).toHaveBeenCalledWith({ id: 1, active: false }))
  })

  it('reactivates an inactive category', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Produits & Catégories' }))
    const sommierRow = await screen.findByRole('row', { name: /Sommier/ })
    await user.click(within(sommierRow).getByRole('button', { name: /Réactiver/ }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /Réactiver/ }))
    await waitFor(() => expect(mockApi.categories.setActive).toHaveBeenCalledWith({ id: 2, active: true }))
  })
})

describe('SettingsPage data tab (ticket 02)', () => {
  it('triggers a backup from the button', async () => {
    vi.mocked(mockApi.files.backupDatabase).mockResolvedValue('C:/backups/store.db')
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Données' }))
    await user.click(await screen.findByRole('button', { name: /Sauvegarder/ }))
    await waitFor(() => expect(mockApi.files.backupDatabase).toHaveBeenCalled())
  })

  it('stages a restore and shows the restart notice', async () => {
    vi.mocked(mockApi.files.restoreDatabase).mockResolvedValue({ requiresRestart: true })
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Données' }))
    await user.click(await screen.findByRole('button', { name: /Restaurer/ }))
    await waitFor(() => expect(mockApi.files.restoreDatabase).toHaveBeenCalled())
    expect(await screen.findByText(/redémarrez l'application/i)).toBeInTheDocument()
  })

  it('deletes all data only after the owner password is confirmed', async () => {
    renderSettings()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Données' }))
    await user.click(await screen.findByRole('button', { name: /Supprimer toutes les données/ }))
    const dialog = await screen.findByRole('dialog')
    const confirm = within(dialog).getByRole('button', { name: /Tout supprimer/ })
    expect(confirm).toBeDisabled()
    await user.type(within(dialog).getByLabelText(/Mot de passe du propriétaire/), 'kamel123')
    await user.click(confirm)
    await waitFor(() => expect(mockApi.data.deleteAll).toHaveBeenCalledWith('kamel123'))
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
