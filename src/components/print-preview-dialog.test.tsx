import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PrintPreviewDialog } from './print-preview-dialog'
import { I18nProvider } from '@/lib/i18n'
import '@/lib/i18n'

const html = '<html><body><p>Ticket</p></body></html>'

function renderDialog(overrides: Partial<Parameters<typeof PrintPreviewDialog>[0]> = {}) {
  return render(
    <I18nProvider>
      <PrintPreviewDialog
        open
        onOpenChange={vi.fn()}
        title="Vente enregistrée"
        html={html}
        onPrint={vi.fn().mockResolvedValue(undefined)}
        printing={false}
        printError={null}
        finishLabel="Terminer la vente"
        onFinish={vi.fn()}
        {...overrides}
      />
    </I18nProvider>,
  )
}

describe('PrintPreviewDialog (ticket 11, seam C)', () => {
  it('renders the print action alongside the finish action', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: 'Imprimer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Terminer la vente' })).toBeInTheDocument()
  })

  it('invokes onPrint when clicked', async () => {
    const onPrint = vi.fn().mockResolvedValue(undefined)
    renderDialog({ onPrint })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Imprimer' }))
    expect(onPrint).toHaveBeenCalled()
  })
})
