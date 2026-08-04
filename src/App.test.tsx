import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { AuthStatus } from '@shared/ipc'
import type { Session } from '@shared/types'
import { I18nProvider } from '@/lib/i18n'
import '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'

const ownerSession: Session = { userId: 1, username: 'Kamel', role: 'owner' }
const employeeSession: Session = { userId: 2, username: 'Sofiane', role: 'employee' }

const mockAuth = {
  status: vi.fn(),
  setupOwner: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  recoverOwner: vi.fn(),
}

const mockApi = {
  auth: mockAuth,
  products: { list: vi.fn().mockResolvedValue([]) },
  categories: { list: vi.fn().mockResolvedValue([]) },
  settings: {
    get: vi.fn(),
    updateReceipt: vi.fn(),
    uploadLogo: vi.fn(),
  },
}

let currentStatus: AuthStatus
let employeeDeliveryAccess = true

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  window.electronAPI = mockApi as never
  currentStatus = { needsSetup: true, session: null }
  employeeDeliveryAccess = true
  mockApi.settings.get.mockResolvedValue({
    id: 1,
    store_name: 'My Life Mattress',
    logo_path: null,
    default_deposit_percentages: [30, 50, 70],
    dimension_presets: ['90x190', '160x190', '180x200'],
    show_delivery_note: true,
    show_phone_on_receipt: true,
    show_quantity_on_receipt: true,
    employees_see_delivered: false,
    employees_can_collect_deliver: true,
    employees_can_access_delivery: employeeDeliveryAccess,
    updated_at: '',
  })
  mockAuth.status.mockImplementation(async () => currentStatus)
})

function CurrentPath() {
  return <span data-testid="current-path">{useLocation().pathname}</span>
}

function renderApp(initialEntries = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <CurrentPath />
            <App />
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>,
  )
}

describe('App routing', () => {
  it('a fresh database opens the owner account creation screen, never Login', async () => {
    renderApp()
    expect(await screen.findByText('Créer le compte propriétaire')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Se connecter' })).not.toBeInTheDocument()
  })

  it('an existing database without a session opens Login, never account creation', async () => {
    currentStatus = { needsSetup: false, session: null }
    renderApp()
    expect(await screen.findByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
    expect(screen.queryByText('Créer le compte propriétaire')).not.toBeInTheDocument()
  })

  it('an owner session shows all six nav sections', async () => {
    currentStatus = { needsSetup: false, session: ownerSession }
    renderApp()
    await waitFor(() => expect(screen.getByText('Kamel')).toBeInTheDocument())
    for (const label of ['Vente Rapide', 'Stock', 'Livraison', 'Rapports', 'Paramètres', 'Guide']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
  })

  it('an employee session never sees Stock, Reports or Settings', async () => {
    currentStatus = { needsSetup: false, session: employeeSession }
    renderApp()
    await waitFor(() => expect(screen.getByText('Sofiane')).toBeInTheDocument())
    await screen.findByRole('link', { name: 'Livraison' })
    for (const label of ['Vente Rapide', 'Livraison', 'Guide']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
    for (const label of ['Stock', 'Rapports', 'Paramètres']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })

  it('an employee session hides Delivery and redirects to Counter when access is disabled', async () => {
    employeeDeliveryAccess = false
    currentStatus = { needsSetup: false, session: employeeSession }
    renderApp(['/delivery'])
    await waitFor(() => expect(screen.getByText('Sofiane')).toBeInTheDocument())
    expect(screen.queryByRole('link', { name: 'Livraison' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent('/'))
  })

  it('fails closed when employee Delivery settings cannot be loaded', async () => {
    mockApi.settings.get.mockRejectedValue(new Error('settings unavailable'))
    currentStatus = { needsSetup: false, session: employeeSession }
    renderApp(['/delivery'])
    await waitFor(() => expect(screen.getByText('Sofiane')).toBeInTheDocument())
    expect(screen.queryByRole('link', { name: 'Livraison' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent('/'))
  })

  it('creating the owner account signs the user in and shows the shell', async () => {
    mockAuth.setupOwner.mockImplementation(async () => {
      currentStatus = { needsSetup: false, session: ownerSession }
      return { session: ownerSession, recoveryCode: 'ABC12345' }
    })
    renderApp()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Nom d\'utilisateur'), 'Kamel')
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123')
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Créer le compte' }))
    expect(await screen.findByText('ABC12345')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /J\'ai noté le code/ }))
    await waitFor(() => expect(screen.getByText('Kamel')).toBeInTheDocument())
  })

  it('rejects mismatched passwords with an inline error', async () => {
    renderApp()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Nom d\'utilisateur'), 'Kamel')
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123')
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'different')
    await user.click(screen.getByRole('button', { name: 'Créer le compte' }))
    expect(await screen.findByText('Les mots de passe ne correspondent pas.')).toBeInTheDocument()
    expect(mockAuth.setupOwner).not.toHaveBeenCalled()
  })

  it('logging in with valid credentials shows the shell', async () => {
    currentStatus = { needsSetup: false, session: null }
    mockAuth.login.mockImplementation(async () => {
      currentStatus = { needsSetup: false, session: ownerSession }
      return ownerSession
    })
    renderApp()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Nom d\'utilisateur'), 'Kamel')
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))
    await waitFor(() => expect(screen.getByText('Kamel')).toBeInTheDocument())
  })

  it('logging out returns to the Login screen', async () => {
    currentStatus = { needsSetup: false, session: ownerSession }
    mockAuth.logout.mockImplementation(async () => {
      currentStatus = { needsSetup: false, session: null }
    })
    renderApp()
    const user = userEvent.setup()
    await waitFor(() => expect(screen.getByText('Kamel')).toBeInTheDocument())
    await user.click(screen.getByLabelText('Se déconnecter'))
    expect(await screen.findByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
  })
})
