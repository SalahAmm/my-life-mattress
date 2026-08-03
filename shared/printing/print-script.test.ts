import { describe, expect, it } from 'vitest'
import { appendPrintScript } from './print-script'

describe('appendPrintScript (ticket 11, seam A)', () => {
  it('injects a load→print and afterprint→close script before the body close', () => {
    const html = appendPrintScript('<html><body><p>Ticket</p></body></html>')
    expect(html).toContain("window.addEventListener('load'")
    expect(html).toContain('window.print()')
    expect(html).toContain("window.addEventListener('afterprint'")
    expect(html).toContain('window.close()')
    expect(html).toMatch(/<\/body><\/html>$/)
  })

  it('handles HTML without an explicit body close tag', () => {
    const html = appendPrintScript('<html><body><p>Ticket</p>')
    expect(html).toContain('window.print()')
  })
})
