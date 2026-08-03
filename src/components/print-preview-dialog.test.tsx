import { render, screen, waitFor } from '@testing-library/react'
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
        browserPrintLabel="Imprimer via navigateur"
        onBrowserPrint={vi.fn().mockResolvedValue(undefined)}
        {...overrides}
      />
    </I18nProvider>,
  )
}

describe('PrintPreviewDialog (ticket 11, seam C)', () => {
  it('renders the browser-print action alongside Electron print', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: 'Imprimer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Imprimer via navigateur' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Terminer la vente' })).toBeInTheDocument()
  })

  it('invokes onBrowserPrint when clicked', async () => {
    const onBrowserPrint = vi.fn().mockResolvedValue(undefined)
    renderDialog({ onBrowserPrint })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Imprimer via navigateur' }))
    await waitFor(() => expect(onBrowserPrint).toHaveBeenCalled())
  })
})
