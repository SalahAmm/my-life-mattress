export function variantLabel(name: string | null, dimension: string | null): string {
  const parts = [name?.trim(), dimension?.trim()].filter(Boolean)
  return parts.join(' — ')
}
