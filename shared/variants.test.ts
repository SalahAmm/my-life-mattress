import { describe, expect, it } from 'vitest'
import { variantLabel } from './variants'

describe('variantLabel (ticket 01)', () => {
  it('prefers the name when present', () => {
    expect(variantLabel('Sahara', null)).toBe('Sahara')
    expect(variantLabel('Sahara', '')).toBe('Sahara')
  })

  it('falls back to the dimension', () => {
    expect(variantLabel(null, '160x190')).toBe('160x190')
    expect(variantLabel('', '160x190')).toBe('160x190')
  })

  it('combines name and dimension when both exist', () => {
    expect(variantLabel('Blanc', '160x190')).toBe('Blanc — 160x190')
  })

  it('never returns a blank label', () => {
    expect(variantLabel(null, null)).toBe('')
    expect(variantLabel('', '')).toBe('')
  })
})
