export function variantLabel(name: string | null, dimension: string | null): string {
  const parts = [name?.trim(), dimension?.trim()].filter(Boolean)
  return parts.join(' — ')
}

export interface SaleItemLike {
  product_variant_id: number | null
  product_name: string | null
  dimension: string | null
  variant_name: string | null
  quantity: number
  custom_description: string | null
}

export function saleItemsLabel(items: SaleItemLike[]): string {
  return items
    .map((item) => {
      const name =
        item.product_variant_id != null
          ? `${item.product_name ?? ''} ${variantLabel(item.variant_name, item.dimension)}`.trim()
          : (item.custom_description ?? '')
      const qty = item.quantity > 1 ? ` ×${item.quantity}` : ''
      return `${name}${qty}`
    })
    .filter(Boolean)
    .join(' · ')
}
