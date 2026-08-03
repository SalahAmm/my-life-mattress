import { render, screen } from '@testing-library/react'
import { BarChart3, Package } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from '@/components/management/empty-state'
import { KpiCard } from '@/components/management/kpi-card'
import { PageHeader } from '@/components/management/page-header'
import { StatusBadge } from '@/components/management/status-badge'

describe('PageHeader', () => {
  it('renders title, subtitle and an end-aligned action', () => {
    const { container } = render(
      <PageHeader title="Stock" subtitle="Tous les produits" action={<button>Ajouter</button>} />,
    )
    expect(screen.getByText('Stock')).toBeInTheDocument()
    expect(screen.getByText('Tous les produits')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument()
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toMatch(/justify-between/)
  })
})

describe('KpiCard', () => {
  it('renders label, value, icon and a status color', () => {
    render(<KpiCard label="En Stock" value="12" icon={Package} status="success" />)
    expect(screen.getByText('En Stock')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    const icon = document.querySelector('[data-slot="kpi-icon"]') as HTMLElement
    expect(icon.className).toMatch(/text-success|bg-success/)
  })

  it('maps the warning status to the warning color', () => {
    render(<KpiCard label="Stock Faible" value="3" icon={BarChart3} status="warning" />)
    const icon = document.querySelector('[data-slot="kpi-icon"]') as HTMLElement
    expect(icon.className).toMatch(/text-warning|bg-warning/)
  })
})

describe('StatusBadge', () => {
  it('maps success status to a green badge', () => {
    const { container } = render(<StatusBadge status="success" label="En Stock" />)
    expect(screen.getByText('En Stock')).toBeInTheDocument()
    expect((container.firstChild as HTMLElement).className).toMatch(/success/)
  })

  it('maps warning and destructive statuses', () => {
    const warning = render(<StatusBadge status="warning" label="Stock Faible" />)
    expect((warning.container.firstChild as HTMLElement).className).toMatch(/warning/)
    const destructive = render(<StatusBadge status="destructive" label="Rupture" />)
    expect((destructive.container.firstChild as HTMLElement).className).toMatch(/destructive/)
  })
})

describe('EmptyState', () => {
  it('renders icon, message, hint and optional action', () => {
    render(
      <EmptyState icon={Package} title="Aucun produit" hint="Ajoutez votre premier produit" action={<button>Ajouter</button>} />,
    )
    expect(screen.getByText('Aucun produit')).toBeInTheDocument()
    expect(screen.getByText('Ajoutez votre premier produit')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument()
  })
})
