// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../connection'
import {
  countUsers,
  createUser,
  findUserByUsername,
  findUserById,
  listUsers,
  setUserActive,
  updateUserPassword,
} from './users'
import { hashPassword } from '../../auth/password'

describe('users queries', () => {
  it('returns zero users on a fresh database', () => {
    const db = createDatabase(':memory:')
    expect(countUsers(db)).toBe(0)
  })

  it('creates a user and finds it by username and id', () => {
    const db = createDatabase(':memory:')
    const id = createUser(db, { username: 'owner', passwordHash: 'h', role: 'owner' })
    expect(id).toBeGreaterThan(0)
    const byName = findUserByUsername(db, 'owner')
    expect(byName?.id).toBe(id)
    expect(byName?.role).toBe('owner')
    const byId = findUserById(db, id)
    expect(byId?.username).toBe('owner')
  })

  it('enforces unique usernames', () => {
    const db = createDatabase(':memory:')
    createUser(db, { username: 'dup', passwordHash: 'a', role: 'owner' })
    expect(() => createUser(db, { username: 'dup', passwordHash: 'b', role: 'employee' })).toThrow()
  })

  it('updates a password hash', () => {
    const db = createDatabase(':memory:')
    const id = createUser(db, { username: 'u', passwordHash: 'old', role: 'employee' })
    updateUserPassword(db, id, 'new')
    expect(findUserById(db, id)?.password_hash).toBe('new')
  })

  it('deactivates a user', () => {
    const db = createDatabase(':memory:')
    const id = createUser(db, { username: 'u', passwordHash: 'x', role: 'employee' })
    setUserActive(db, id, false)
    expect(findUserById(db, id)?.active).toBe(0)
    expect(listUsers(db).map((u) => u.username)).toEqual(['u'])
  })

  it('does not expose password hashes in listUsers', () => {
    const db = createDatabase(':memory:')
    createUser(db, { username: 'u', passwordHash: 'secret', role: 'owner' })
    expect(listUsers(db)[0]).not.toHaveProperty('password_hash')
  })

  it('hashes and verifies passwords with bcrypt', async () => {
    const hash = await hashPassword('monMotDePasse')
    expect(hash).not.toBe('monMotDePasse')
    expect(await verifyPassword('monMotDePasse', hash)).toBe(true)
    expect(await verifyPassword('autreMotDePasse', hash)).toBe(false)
  })
})

import { verifyPassword } from '../../auth/password'
