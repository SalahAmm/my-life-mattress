import { describe, expect, it } from 'vitest'
import { productImageUrl } from './product-image'

describe('productImageUrl (ticket 02)', () => {
  it('returns an app-asset url for a stored image path', () => {
    expect(productImageUrl('C:/userData/products/p1.png')).toBe('app-asset://products/p1.png')
    expect(productImageUrl('C:\\userData\\products\\p1.png')).toBe('app-asset://products/p1.png')
  })

  it('returns null when no image is stored (letter-tile fallback)', () => {
    expect(productImageUrl(null)).toBeNull()
    expect(productImageUrl('')).toBeNull()
  })
})
