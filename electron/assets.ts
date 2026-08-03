import path from 'node:path'

export function resolveAppAsset(
  url: string,
  dirs: { logos: string; products: string },
): string | null {
  const parsed = new URL(url)
  const folder = decodeURIComponent(parsed.hostname)
  const requested = decodeURIComponent(parsed.pathname).replace(/^[/\\]+/, '')
  const base = folder === 'logos' ? dirs.logos : folder === 'products' ? dirs.products : null
  if (!base) return null
  const resolved = path.normalize(path.join(base, requested))
  const baseNorm = path.normalize(base)
  if (!(resolved === baseNorm || resolved.startsWith(baseNorm + path.sep))) {
    return null
  }
  return resolved
}
