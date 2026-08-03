export function productImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null
  const name = imagePath.split(/[\\/]/).pop() ?? ''
  if (!name) return null
  return `app-asset://products/${encodeURIComponent(name)}`
}
