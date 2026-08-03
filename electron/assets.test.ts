// @vitest-environment node
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveAppAsset } from './assets'

const dirs = {
  logos: path.normalize('C:/data/logos'),
  products: path.normalize('C:/data/products'),
}

describe('resolveAppAsset (image fix)', () => {
  it('resolves logos from the logos folder', () => {
    expect(resolveAppAsset('app-asset://logos/logo.png', dirs)).toBe(path.join(dirs.logos, 'logo.png'))
  })

  it('resolves products from the products folder', () => {
    expect(resolveAppAsset('app-asset://products/product-1.png', dirs)).toBe(
      path.join(dirs.products, 'product-1.png'),
    )
  })

  it('rejects unknown folders', () => {
    expect(resolveAppAsset('app-asset://other/logo.png', dirs)).toBeNull()
  })

  it('keeps dot-dot attempts inside the folder (URL parser neutralizes them)', () => {
    expect(resolveAppAsset('app-asset://logos/../secret.txt', dirs)).toBe(path.join(dirs.logos, 'secret.txt'))
    expect(resolveAppAsset('app-asset://logos/%2e%2e/secret.txt', dirs)).toBe(path.join(dirs.logos, 'secret.txt'))
  })
})
