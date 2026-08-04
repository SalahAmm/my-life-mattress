import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv (ticket 03)', () => {
  it('prepends a UTF-8 BOM', () => {
    const csv = toCsv([{ name: 'Rafik', total: '1000' }], ['name', 'total'])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  it('escapes commas, quotes and newlines', () => {
    const csv = toCsv(
      [{ name: 'Ahmed, "le grand"', note: 'ligne1\nligne2', phone: '0550' }],
      ['name', 'note', 'phone'],
    )
    expect(csv).toContain('"Ahmed, ""le grand"""')
    expect(csv).toContain('"ligne1\nligne2"')
    expect(csv).toContain('0550')
  })

  it('writes headers and rows in column order', () => {
    const csv = toCsv([{ a: '1', b: '2' }, { a: '3', b: '4' }], ['a', 'b'])
    const lines = csv.replace('\uFEFF', '').split('\r\n')
    expect(lines[0]).toBe('a,b')
    expect(lines[1]).toBe('1,2')
    expect(lines[2]).toBe('3,4')
  })

  it('produces a valid header-only CSV for empty rows', () => {
    const csv = toCsv([], ['a', 'b'])
    expect(csv.trim().endsWith('a,b')).toBe(true)
  })
})
