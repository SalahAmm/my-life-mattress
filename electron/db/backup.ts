import fs from 'node:fs'
import path from 'node:path'
import type Database from 'better-sqlite3'

const SQLITE_HEADER = 'SQLite format 3\u0000'

export function validateSqliteFile(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, 'r')
    try {
      const buffer = Buffer.alloc(16)
      const read = fs.readSync(fd, buffer, 0, 16, 0)
      return read === 16 && buffer.toString('latin1') === SQLITE_HEADER
    } finally {
      fs.closeSync(fd)
    }
  } catch {
    return false
  }
}

export async function backupDatabaseTo(db: Database.Database, destPath: string): Promise<void> {
  const escaped = destPath.replaceAll("'", "''")
  db.prepare(`VACUUM INTO '${escaped}'`).run()
}

export function applyPendingRestore(dbPath: string): 'applied' | 'none' {
  const pendingPath = `${dbPath}.restore`
  if (!fs.existsSync(pendingPath)) {
    return 'none'
  }
  if (fs.existsSync(dbPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    fs.copyFileSync(dbPath, `${dbPath}.pre-restore-${timestamp}`)
  }
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${dbPath}${suffix}`)) {
      fs.rmSync(`${dbPath}${suffix}`)
    }
  }
  fs.rmSync(dbPath, { force: true })
  fs.renameSync(pendingPath, dbPath)
  return 'applied'
}

export function stageRestoreFile(pendingPath: string, dbPath: string): boolean {
  if (!validateSqliteFile(pendingPath)) {
    return false
  }
  fs.copyFileSync(pendingPath, `${dbPath}.restore`)
  return true
}

export function dbPathFor(userDataDir: string): string {
  return path.join(userDataDir, 'store.db')
}
