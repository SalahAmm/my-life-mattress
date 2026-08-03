import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
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
}

let currentStatus: AuthStatus

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  window.electronAPI = mockApi as never
  currentStatus = { needsSetup: true, session: null }
  mockAuth.status.mockImplementation(async () => currentStatus)
})

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter>
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
    for (const label of ['Vente Rapide', 'Livraison', 'Guide']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
    for (const label of ['Stock', 'Rapports', 'Paramètres']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
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
