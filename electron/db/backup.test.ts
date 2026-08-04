// @vitest-environment node
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { applyPendingRestore, backupDatabaseTo, validateSqliteFile } from './backup'

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mlm-backup-'))
}

function makeDb(file: string): Database.Database {
  const db = new Database(file)
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, note TEXT)')
  db.prepare('INSERT INTO t (note) VALUES (?)').run('marker')
  return db
}

describe('backup helpers (ticket 02)', () => {
  it('rejects files that are not SQLite databases', () => {
    const dir = tempDir()
    const junk = path.join(dir, 'junk.db')
    fs.writeFileSync(junk, 'not a database at all')
    expect(validateSqliteFile(junk)).toBe(false)
  })

  it('accepts a real SQLite database file', () => {
    const dir = tempDir()
    const source = path.join(dir, 'store.db')
    makeDb(source)
    expect(validateSqliteFile(source)).toBe(true)
  })

  it('backupDatabaseTo produces an identical, valid copy', async () => {
    const dir = tempDir()
    const source = path.join(dir, 'store.db')
    const db = makeDb(source)
    const dest = path.join(dir, 'backup.db')
    await backupDatabaseTo(db, dest)
    db.close()
    expect(validateSqliteFile(dest)).toBe(true)
    const check = new Database(dest, { readonly: true })
    expect((check.prepare('SELECT note FROM t').get() as { note: string }).note).toBe('marker')
    check.close()
  })

  it('applyPendingRestore swaps in a pending restore file and preserves the old db', () => {
    const dir = tempDir()
    const dbPath = path.join(dir, 'store.db')
    const db = makeDb(dbPath)
    db.close()
    const restorePath = `${dbPath}.restore`
    makeDb(restorePath).close()
    fs.copyFileSync(dbPath, restorePath)
    const applied = applyPendingRestore(dbPath)
    expect(applied).toBe('applied')
    const restored = new Database(dbPath)
    expect(restored.prepare('SELECT note FROM t').get()).toEqual({ note: 'marker' })
    restored.close()
    const preRestore = fs.readdirSync(dir).find((f) => f.startsWith('store.db.pre-restore'))
    expect(preRestore).toBeDefined()
  })

  it('applyPendingRestore reports none when no restore file exists', () => {
    const dir = tempDir()
    const dbPath = path.join(dir, 'store.db')
    const db = makeDb(dbPath)
    db.close()
    expect(applyPendingRestore(dbPath)).toBe('none')
  })

  it('drops stale WAL files after restoring', () => {
    const dir = tempDir()
    const dbPath = path.join(dir, 'store.db')
    makeDb(dbPath).close()
    fs.writeFileSync(`${dbPath}-wal`, 'wal')
    fs.writeFileSync(`${dbPath}-shm`, 'shm')
    const restorePath = `${dbPath}.restore`
    makeDb(restorePath).close()
    applyPendingRestore(dbPath)
    expect(fs.existsSync(`${dbPath}-wal`)).toBe(false)
    expect(fs.existsSync(`${dbPath}-shm`)).toBe(false)
  })
})
