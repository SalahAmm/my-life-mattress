import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ElectronAPI } from '@shared/ipc'
import { LoginScreen } from './login'
import { I18nProvider } from '@/lib/i18n'
import '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'

const mockApi = {
  auth: {
    status: vi.fn(),
    setupOwner: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    recoverOwner: vi.fn(),
  },
} as unknown as ElectronAPI

beforeEach(() => {
  vi.clearAllMocks()
  window.electronAPI = mockApi
})

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <LoginScreen />
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>,
  )
}

describe('LoginScreen edge cases', () => {
  it('shows the invalid message for a wrong recovery code', async () => {
    vi.mocked(mockApi.auth.recoverOwner).mockRejectedValue({ code: 'RECOVERY_CODE_INVALID' })
    renderLogin()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Mot de passe oublié/ }))
    await user.type(await screen.findByLabelText('Code de récupération'), 'ZZZZZZZZ')
    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'newpass456')
    await user.click(screen.getByRole('button', { name: 'Réinitialiser le mot de passe' }))
    expect(await screen.findByText('Code de récupération invalide.')).toBeInTheDocument()
  })

  it('disables the login button while the request is pending', async () => {
    let resolveLogin: (session: { userId: number; username: string; role: string }) => void = () => {}
    vi.mocked(mockApi.auth.login).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve as (session: { userId: number; username: string; role: string }) => void
        }),
    )
    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Nom d\'utilisateur'), 'Kamel')
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Se connecter/ })).toBeDisabled(),
    )
    resolveLogin({ userId: 1, username: 'Kamel', role: 'owner' })
  })
})
