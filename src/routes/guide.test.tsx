import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Session } from '@shared/types'
import { GuidePage } from './guide'
import { I18nProvider } from '@/lib/i18n'
import '@/lib/i18n'

function renderGuide(session: Session) {
  return render(
    <I18nProvider>
      <GuidePage session={session} />
    </I18nProvider>,
  )
}

describe('GuidePage (ticket 03)', () => {
  it('renders the main sections', () => {
    renderGuide({ userId: 1, username: 'Kamel', role: 'owner' })
    expect(screen.getByRole('heading', { name: /Guide d'utilisation/ })).toBeInTheDocument()
    expect(screen.getByText('Démarrage rapide')).toBeInTheDocument()
    expect(screen.getByText('Comptoir (vente)')).toBeInTheDocument()
    expect(screen.getByText('Gestion du stock')).toBeInTheDocument()
    expect(screen.getByText('Livraison')).toBeInTheDocument()
    expect(screen.getByText('Rapports')).toBeInTheDocument()
    expect(screen.getByText('Réglages')).toBeInTheDocument()
    expect(screen.getByText('Conseils')).toBeInTheDocument()
  })

  it('works for an employee session too', () => {
    renderGuide({ userId: 2, username: 'Salim', role: 'employee' })
    expect(screen.getByRole('heading', { name: /Guide d'utilisation/ })).toBeInTheDocument()
  })
})
