import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
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
  printing: { printReceipt: vi.fn() },
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
})
