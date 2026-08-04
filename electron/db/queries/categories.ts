import type { Database } from 'better-sqlite3'
import type { Category } from '@shared/types'

export const DEFAULT_CATEGORIES = ['Matelas', 'Sommier', 'Accessoires']

export function seedDefaultCategories(db: Database): void {
  const existing = (db.prepare('SELECT COUNT(*) AS n FROM categories').get() as { n: number }).n
  if (existing > 0) return
  const insert = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)')
  const run = db.transaction(() => {
    DEFAULT_CATEGORIES.forEach((name, index) => insert.run(name, index))
  })
  run()
}

export function listCategories(db: Database): Category[] {
  const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all() as Array<
    Omit<Category, 'active'> & { active: number }
  >
  return rows.map((row) => ({ ...row, active: Boolean(row.active) }))
}

export function listActiveCategories(db: Database): Category[] {
  const rows = db
    .prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order, id')
    .all() as Array<Omit<Category, 'active'> & { active: number }>
  return rows.map((row) => ({ ...row, active: Boolean(row.active) }))
}

export function listAllCategories(db: Database): Category[] {
  return listCategories(db)
}

export function activeCategoryCount(db: Database): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM categories WHERE active = 1').get() as { n: number }
  return row.n
}

export function nextCategorySortOrder(db: Database): number {
  const row = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM categories').get() as {
    max_order: number
  }
  return row.max_order + 1
}

export function createCategory(db: Database, input: { name: string; sortOrder: number }): number {
  const result = db
    .prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)')
    .run(input.name, input.sortOrder)
  return Number(result.lastInsertRowid)
}

export function renameCategory(db: Database, id: number, name: string): void {
  db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id)
}

export function deactivateCategory(db: Database, id: number): void {
  db.prepare('UPDATE categories SET active = 0 WHERE id = ?').run(id)
}

export function tryDeactivateCategory(db: Database, id: number): boolean {
  if (activeCategoryCount(db) <= 1) return false
  deactivateCategory(db, id)
  return true
}

export function reactivateCategory(db: Database, id: number): void {
  db.prepare('UPDATE categories SET active = 1 WHERE id = ?').run(id)
}
