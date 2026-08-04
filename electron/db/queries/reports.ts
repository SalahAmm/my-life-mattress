import type { Database } from 'better-sqlite3'
import { variantLabel } from '@shared/variants'

export interface ReportRange {
  from: string
  to: string
}

export interface ProductBreakdown {
  label: string
  units: number
  revenue: number
}

export interface ReportSummary {
  revenue: number
  depositsCollected: number
  outstanding: number
  salesCount: number
  perProduct: ProductBreakdown[]
}

export function reportSummary(db: Database, range: ReportRange): ReportSummary {
  const from = range.from
  const to = range.to

  const revenue = (
    db
      .prepare(
        `SELECT COALESCE(SUM(si.quantity * si.unit_price_at_sale), 0) AS total
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         WHERE s.created_at >= ? AND s.created_at < ? AND s.status != 'cancelled'`,
      )
      .get(from, to) as { total: number }
  ).total

  const depositsCollected = (
    db
      .prepare(
        `SELECT COALESCE(SUM(p.amount), 0) AS total
         FROM payments p
         JOIN sales s ON s.id = p.sale_id
         WHERE p.type = 'deposit' AND s.created_at >= ? AND s.created_at < ? AND s.status != 'cancelled'`,
      )
      .get(from, to) as { total: number }
  ).total

  const outstanding = (
    db
      .prepare(
        `SELECT COALESCE(SUM(t.total - t.paid), 0) AS total
         FROM (
           SELECT s.id,
             COALESCE((SELECT SUM(si.quantity * si.unit_price_at_sale) FROM sale_items si WHERE si.sale_id = s.id), 0) AS total,
             COALESCE((SELECT SUM(amount) FROM payments WHERE sale_id = s.id), 0) AS paid
           FROM sales s
           WHERE s.created_at >= ? AND s.created_at < ? AND s.status != 'cancelled'
         ) t
         WHERE t.total - t.paid > 0`,
      )
      .get(from, to) as { total: number }
  ).total

  const salesCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM sales
         WHERE created_at >= ? AND created_at < ? AND status != 'cancelled'`,
      )
      .get(from, to) as { n: number }
  ).n

  const rows = db
    .prepare(
      `SELECT
         p.name AS product_name, v.dimension, v.name AS variant_name, si.custom_description,
         SUM(si.quantity) AS units,
         SUM(si.quantity * si.unit_price_at_sale) AS revenue
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       LEFT JOIN product_variants v ON v.id = si.product_variant_id
       LEFT JOIN products p ON p.id = v.product_id
       WHERE s.created_at >= ? AND s.created_at < ? AND s.status != 'cancelled'
       GROUP BY si.product_variant_id, p.name, v.dimension, v.name, si.custom_description
       ORDER BY revenue DESC
       LIMIT 20`,
    )
    .all(from, to) as {
    product_name: string | null
    dimension: string | null
    variant_name: string | null
    custom_description: string | null
    units: number
    revenue: number
  }[]

  const perProduct: ProductBreakdown[] = rows.map((row) => ({
    label:
      row.product_name != null
        ? `${row.product_name} ${variantLabel(row.variant_name, row.dimension)}`.trim()
        : (row.custom_description ?? ''),
    units: row.units,
    revenue: row.revenue,
  }))

  return { revenue, depositsCollected, outstanding, salesCount, perProduct }
}
