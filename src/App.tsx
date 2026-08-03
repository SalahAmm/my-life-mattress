import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/app-shell'
import { api } from '@/lib/ipc-client'
import { LoginScreen } from '@/routes/login'
import { SetupScreen } from '@/routes/setup'

export default function App() {
  const { data: status, isLoading } = useQuery({
    queryKey: ['auth-status'],
    queryFn: () => api.auth.status(),
  })

  if (isLoading || !status) {
    return null
  }

  if (status.needsSetup) {
    return <SetupScreen />
  }

  if (!status.session) {
    return <LoginScreen />
  }

  return <AppShell session={status.session} />
}
