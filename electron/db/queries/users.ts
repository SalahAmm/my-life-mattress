import type { Database } from 'better-sqlite3'
import type { Role, UserRow } from '@shared/types'

type UserPublic = Omit<UserRow, 'password_hash' | 'recovery_code_hash'>

const PUBLIC_COLUMNS = 'id, username, role, active, created_at'

export function countUsers(db: Database): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n
}

export function createUser(
  db: Database,
  input: { username: string; passwordHash: string; role: Role },
): number {
  const result = db
    .prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .run(input.username, input.passwordHash, input.role)
  return Number(result.lastInsertRowid)
}

export function findUserByUsername(db: Database, username: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined
}

export function findUserById(db: Database, id: number): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
}

export function updateUserPassword(db: Database, id: number, passwordHash: string): void {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id)
}

export function setRecoveryCodeHash(db: Database, id: number, codeHash: string | null): void {
  db.prepare('UPDATE users SET recovery_code_hash = ? WHERE id = ?').run(codeHash, id)
}

export function setUserActive(db: Database, id: number, active: boolean): void {
  db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, id)
}

export function listUsers(db: Database): UserPublic[] {
  return db
    .prepare(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY id`)
    .all() as UserPublic[]
}

export interface DeactivationOutcome {
  ok: boolean
  reason?: 'SELF_DEACTIVATION' | 'LAST_OWNER' | 'NOT_FOUND'
}

export function assertCanDeactivateUser(db: Database, targetId: number, currentUserId: number): DeactivationOutcome {
  if (targetId === currentUserId) {
    return { ok: false, reason: 'SELF_DEACTIVATION' }
  }
  const target = findUserById(db, targetId)
  if (!target) {
    return { ok: false, reason: 'NOT_FOUND' }
  }
  if (target.role === 'owner') {
    const activeOwners = (
      db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'owner' AND active = 1").get() as { n: number }
    ).n
    if (activeOwners <= 1) {
      return { ok: false, reason: 'LAST_OWNER' }
    }
  }
  return { ok: true }
}
