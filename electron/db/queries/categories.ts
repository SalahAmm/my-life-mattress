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
  return db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all() as Category[]
}

export function listActiveCategories(db: Database): Category[] {
  return db
    .prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order, id')
    .all() as Category[]
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
