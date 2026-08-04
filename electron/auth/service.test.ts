// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../db/connection'
import { countUsers } from '../db/queries/users'
import { listCategories } from '../db/queries/categories'
import { AuthService } from './service'
import type Database from 'better-sqlite3'

function setup(): { db: Database.Database; auth: AuthService } {
  const db = createDatabase(':memory:')
  return { db, auth: new AuthService(db) }
}

describe('AuthService', () => {
  it('reports needsSetup on a fresh database', () => {
    const { auth } = setup()
    expect(auth.needsSetup()).toBe(true)
  })

  it('setupOwner creates the owner account and returns a session and recovery code', async () => {
    const { db, auth } = setup()
    const result = await auth.setupOwner({ username: 'Kamel', password: 'secret123' })
    expect(result.session.role).toBe('owner')
    expect(result.session.username).toBe('Kamel')
    expect(result.recoveryCode).toMatch(/^[A-Z2-9]{8}$/)
    expect(countUsers(db)).toBe(1)
  })

  it('setupOwner seeds the default categories', async () => {
    const { db, auth } = setup()
    await auth.setupOwner({ username: 'Kamel', password: 'secret123' })
    expect(listCategories(db).map((c) => c.name)).toEqual(['Matelas', 'Sommier', 'Accessoires'])
  })

  it('refuses a second setupOwner call', async () => {
    const { auth } = setup()
    await auth.setupOwner({ username: 'Kamel', password: 'secret123' })
    await expect(auth.setupOwner({ username: 'Kamel2', password: 'secret123' })).rejects.toThrow()
  })

  it('rejects short passwords and empty usernames', async () => {
    const { auth } = setup()
    await expect(auth.setupOwner({ username: '', password: 'secret123' })).rejects.toThrow()
    await expect(auth.setupOwner({ username: 'Kamel', password: '123' })).rejects.toThrow()
  })

  it('logs in with correct credentials and rejects wrong ones', async () => {
    const { auth } = setup()
    await auth.setupOwner({ username: 'Kamel', password: 'secret123' })
    const session = await auth.login('Kamel', 'secret123')
    expect(session.role).toBe('owner')
    await expect(auth.login('Kamel', 'wrongpass')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    await expect(auth.login('nobody', 'secret123')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })

  it('rejects login for deactivated users', async () => {
    const { db, auth } = setup()
    await auth.setupOwner({ username: 'Kamel', password: 'secret123' })
    await auth.login('Kamel', 'secret123')
    const session = auth.getSession()!
    db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(session.userId)
    await expect(auth.login('Kamel', 'secret123')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })

  it('invalidates the live session when the user is deactivated mid-session', async () => {
    const { db, auth } = setup()
    await auth.setupOwner({ username: 'Kamel', password: 'secret123' })
    await auth.login('Kamel', 'secret123')
    expect(auth.getSession()).not.toBeNull()
    const session = auth.getSession()!
    db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(session.userId)
    expect(auth.getSession()).toBeNull()
  })

  it('keeps a single session in memory and logs out', async () => {
    const { auth } = setup()
    await auth.setupOwner({ username: 'Kamel', password: 'secret123' })
    expect(auth.getSession()?.username).toBe('Kamel')
    auth.logout()
    expect(auth.getSession()).toBeNull()
  })

  it('creates employee sessions with employee role', async () => {
    const { db, auth } = setup()
    await auth.setupOwner({ username: 'Kamel', password: 'secret123' })
    db.prepare(
      "INSERT INTO users (username, password_hash, role) VALUES ('Sofiane', ?, 'employee')",
    ).run(await require('bcryptjs').hash('emp12345', 10))
    const session = await auth.login('Sofiane', 'emp12345')
    expect(session.role).toBe('employee')
  })

  it('recovery: only the hashed code is stored, and it resets the owner password once', async () => {
    const { db, auth } = setup()
    const { recoveryCode } = await auth.setupOwner({ username: 'Kamel', password: 'secret123' })
    const stored = db
      .prepare('SELECT recovery_code_hash FROM users WHERE username = ?')
      .get('Kamel') as { recovery_code_hash: string }
    expect(stored.recovery_code_hash).not.toBe(recoveryCode)
    await auth.recoverOwner({ code: recoveryCode, newPassword: 'newpass456' })
    await expect(auth.login('Kamel', 'newpass456')).resolves.toBeTruthy()
    await expect(
      auth.recoverOwner({ code: recoveryCode, newPassword: 'newpass456' }),
    ).rejects.toMatchObject({ code: 'RECOVERY_CODE_INVALID' })
  })

  it('rejects a wrong recovery code', async () => {
    const { auth } = setup()
    await auth.setupOwner({ username: 'Kamel', password: 'secret123' })
    await expect(
      auth.recoverOwner({ code: 'ZZZZZZZZ', newPassword: 'newpass456' }),
    ).rejects.toMatchObject({ code: 'RECOVERY_CODE_INVALID' })
  })

  it('role guard rejects employee sessions for owner-only actions', async () => {
    const { db, auth } = setup()
    await auth.setupOwner({ username: 'Kamel', password: 'secret123' })
    db.prepare(
      "INSERT INTO users (username, password_hash, role) VALUES ('Sofiane', ?, 'employee')",
    ).run(await require('bcryptjs').hash('emp12345', 10))
    await auth.login('Sofiane', 'emp12345')
    expect(auth.requireOwner()).toBe(false)
    await auth.logout()
    await auth.login('Kamel', 'secret123')
    expect(auth.requireOwner()).toBe(true)
  })
})
