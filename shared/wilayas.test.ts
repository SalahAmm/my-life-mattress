import { describe, expect, it } from 'vitest'
import { WILAYAS } from './wilayas'

describe('wilayas (ticket 01)', () => {
  it('contains 58 unique wilayas', () => {
    expect(WILAYAS).toHaveLength(58)
    expect(new Set(WILAYAS).size).toBe(58)
  })

  it('includes the well-known ones', () => {
    expect(WILAYAS).toContain('Alger')
    expect(WILAYAS).toContain('Oran')
    expect(WILAYAS).toContain('Constantine')
    expect(WILAYAS[0]).toBe('Adrar')
  })

  it('all entries are non-empty strings', () => {
    for (const wilaya of WILAYAS) {
      expect(typeof wilaya).toBe('string')
      expect(wilaya.trim().length).toBeGreaterThan(0)
    }
  })
})
