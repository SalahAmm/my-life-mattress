// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const BUNDLED_LOGO = path.join(import.meta.dirname, '..', '..', 'electron', 'assets', 'brand', 'logo.png')
const PUBLIC_LOGO = path.join(import.meta.dirname, '..', '..', 'public', 'brand', 'logo.png')

describe('bundled brand logo (ticket 02, seam D)', () => {
  it('ships a logo for the print pipeline and the renderer', () => {
    expect(fs.existsSync(BUNDLED_LOGO)).toBe(true)
    expect(fs.existsSync(PUBLIC_LOGO)).toBe(true)
  })

  it('the two copies are identical', () => {
    expect(fs.readFileSync(BUNDLED_LOGO)).toEqual(fs.readFileSync(PUBLIC_LOGO))
  })
})

import { chooseLogoSrc } from '../../electron/printing/logo'

describe('chooseLogoSrc', () => {
  it('prefers the uploaded logo over the bundled default', () => {
    expect(chooseLogoSrc('C:/data/logo.png', 'data:image/png;base64,AAAA')).toBe('C:/data/logo.png')
  })

  it('falls back to the bundled default when no logo is uploaded', () => {
    expect(chooseLogoSrc(null, 'data:image/png;base64,BBBB')).toBe('data:image/png;base64,BBBB')
  })

  it('returns null only when neither exists', () => {
    expect(chooseLogoSrc(null, null)).toBeNull()
  })
})
