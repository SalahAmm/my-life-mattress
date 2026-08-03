import { describe, expect, it } from 'vitest'
import fr from './fr.json'
import ar from './ar.json'

function collectPaths(obj: unknown, prefix = '', out: string[] = []): string[] {
  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key
      collectPaths(value, path, out)
    }
  } else {
    out.push(prefix)
  }
  return out
}

describe('i18n catalogs', () => {
  it('every fr key exists in ar and vice versa', () => {
    const frPaths = collectPaths(fr).sort()
    const arPaths = collectPaths(ar).sort()
    expect(arPaths).toEqual(frPaths)
  })

  it('no leaf value is an empty string', () => {
    const check = (obj: unknown) => {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (typeof value === 'string') {
          expect(value.trim().length, key).toBeGreaterThan(0)
        } else {
          check(value)
        }
      }
    }
    check(fr)
    check(ar)
  })
})
