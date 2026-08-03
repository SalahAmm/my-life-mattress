import Database from 'better-sqlite3'
import { MIGRATIONS } from './schema'

export function createDatabase(location: string | Buffer): Database.Database {
  const db = new Database(location)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  applyMigrations(db)
  return db
}

export function applyMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `)
  const applied = new Set(
    (db.prepare('SELECT version FROM _migrations').all() as { version: number }[]).map(
      (r) => r.version,
    ),
  )
  const run = db.transaction((migration: { version: number; up: (db: Database.Database) => void }) => {
    migration.up(db)
    db.prepare('INSERT INTO _migrations (version) VALUES (?)').run(migration.version)
  })
  for (const migration of MIGRATIONS) {
    if (!applied.has(migration.version)) {
      run(migration)
    }
  }
}
