import type { Database } from 'better-sqlite3'
import type { Supplier } from '@shared/types'

export function listSuppliers(db: Database): Supplier[] {
  return db.prepare('SELECT * FROM suppliers ORDER BY name').all() as Supplier[]
}

export function listActiveSuppliers(db: Database): Supplier[] {
  return db.prepare('SELECT * FROM suppliers WHERE active = 1 ORDER BY name').all() as Supplier[]
}

export function createSupplier(db: Database, input: { name: string; phone: string | null }): number {
  const result = db
    .prepare('INSERT INTO suppliers (name, phone) VALUES (?, ?)')
    .run(input.name, input.phone)
  return Number(result.lastInsertRowid)
}

export function renameSupplier(db: Database, id: number, name: string): void {
  db.prepare('UPDATE suppliers SET name = ? WHERE id = ?').run(name, id)
}

export function setSupplierPhone(db: Database, id: number, phone: string | null): void {
  db.prepare('UPDATE suppliers SET phone = ? WHERE id = ?').run(phone, id)
}

export function setSupplierActive(db: Database, id: number, active: boolean): void {
  db.prepare('UPDATE suppliers SET active = ? WHERE id = ?').run(active ? 1 : 0, id)
}
