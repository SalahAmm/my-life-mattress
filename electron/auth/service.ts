import type { Database } from 'better-sqlite3'
import { z } from 'zod'
import type { Role, Session } from '@shared/types'
import { AppError } from '@shared/types'
import { seedDefaultCategories } from '../db/queries/categories'
import {
  countUsers,
  createUser,
  findUserByUsername,
  setRecoveryCodeHash,
  updateUserPassword,
} from '../db/queries/users'
import { hashPassword, verifyPassword } from './password'

const USERNAME = z.string().trim().min(3).max(50)
const PASSWORD = z.string().min(6).max(200)

const SETUP_SCHEMA = z.object({
  username: USERNAME,
  password: PASSWORD,
})

const LOGIN_SCHEMA = z.object({
  username: z.string(),
  password: z.string(),
})

const RECOVER_SCHEMA = z.object({
  code: z.string().trim().length(8),
  newPassword: PASSWORD,
})

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateRecoveryCode(): string {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

export class AuthService {
  private session: Session | null = null

  constructor(private db: Database) {}

  needsSetup(): boolean {
    return countUsers(this.db) === 0
  }

  getSession(): Session | null {
    if (!this.session) return null
    const user = findUserByUsername(this.db, this.session.username)
    if (!user || !user.active) {
      this.session = null
    }
    return this.session
  }

  requireOwner(): boolean {
    return this.session?.role === 'owner'
  }

  async setupOwner(input: unknown): Promise<{ session: Session; recoveryCode: string }> {
    const parsed = SETUP_SCHEMA.safeParse(input)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    if (!this.needsSetup()) {
      throw new AppError('VALIDATION_ERROR', 'Owner account already exists')
    }
    const { username, password } = parsed.data
    const passwordHash = await hashPassword(password)
    const recoveryCode = generateRecoveryCode()
    const recoveryCodeHash = await hashPassword(recoveryCode)
    const userId = this.db.transaction(() => {
      seedDefaultCategories(this.db)
      const newId = createUser(this.db, { username, passwordHash, role: 'owner' })
      setRecoveryCodeHash(this.db, newId, recoveryCodeHash)
      return newId
    })()
    this.session = { userId, username, role: 'owner' }
    return { session: this.session, recoveryCode }
  }

  async login(username: string, password: string): Promise<Session> {
    const parsed = LOGIN_SCHEMA.safeParse({ username, password })
    if (!parsed.success) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid credentials')
    }
    const user = findUserByUsername(this.db, parsed.data.username)
    if (!user || !user.active || !(await verifyPassword(parsed.data.password, user.password_hash))) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid credentials')
    }
    this.session = { userId: user.id, username: user.username, role: user.role }
    return this.session
  }

  async recoverOwner(input: unknown): Promise<Session> {
    const parsed = RECOVER_SCHEMA.safeParse(input)
    if (!parsed.success) {
      throw new AppError('RECOVERY_CODE_INVALID', 'Invalid recovery code')
    }
    const ownerRow = this.db
      .prepare('SELECT id, recovery_code_hash FROM users WHERE role = ? AND active = 1 LIMIT 1')
      .get('owner') as { id: number; recovery_code_hash: string | null } | undefined
    if (
      !ownerRow ||
      !ownerRow.recovery_code_hash ||
      !(await verifyPassword(parsed.data.code, ownerRow.recovery_code_hash))
    ) {
      throw new AppError('RECOVERY_CODE_INVALID', 'Invalid recovery code')
    }
    const newHash = await hashPassword(parsed.data.newPassword)
    this.db.transaction(() => {
      updateUserPassword(this.db, ownerRow.id, newHash)
      setRecoveryCodeHash(this.db, ownerRow.id, null)
    })()
    const fresh = this.db.prepare('SELECT * FROM users WHERE id = ?').get(ownerRow.id) as {
      id: number
      username: string
      role: Role
    }
    this.session = { userId: fresh.id, username: fresh.username, role: fresh.role }
    return this.session
  }

  logout(): void {
    this.session = null
  }
}
