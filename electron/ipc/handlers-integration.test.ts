// @vitest-environment node
import type { Database } from 'better-sqlite3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDatabase } from '../db/connection'

type Handler = (event: unknown, payload: unknown) => Promise<{ ok: boolean; error?: { code: string } }>

const handlers = new Map<string, Handler>()

vi.mock('electron', () => ({
  app: { getPath: () => '' },
  dialog: {},
  ipcMain: {
    handle: vi.fn((channel: string, fn: Handler) => {
      handlers.set(channel, fn)
    }),
  },
}))

import { registerIpcHandlers } from './handlers'

function authWith(role: 'owner' | 'employee') {
  return {
    getSession: () => ({ userId: 1, username: 'Kamel', role }),
  } as never
}

let db: Database

beforeEach(() => {
  handlers.clear()
  db = createDatabase(':memory:')
})

async function call(channel: string, payload: unknown): Promise<{ ok: boolean; error?: { code: string } }> {
  const handler = handlers.get(channel)
  if (!handler) throw new Error(`no handler registered for ${channel}`)
  return handler({}, payload)
}

describe('delivery IPC guards (employee access off)', () => {
  beforeEach(() => {
    registerIpcHandlers(db, authWith('employee'))
  })

  it('rejects sales:list for employees when access is off', async () => {
    const result = await call('sales:list', { status: 'ordered' })
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('rejects sales:addPayment for employees when access is off', async () => {
    const result = await call('sales:addPayment', {
      saleId: 1,
      amount: 1000,
      type: 'balance',
      enteredAsPercentage: null,
    })
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('rejects sales:setStatus for employees when access is off', async () => {
    const result = await call('sales:setStatus', { saleId: 1, status: 'delivered' })
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('allows sales:list when the owner enables access', async () => {
    db.prepare('UPDATE receipt_settings SET employees_can_access_delivery = 1').run()
    const result = await call('sales:list', { status: 'ordered' })
    expect(result.ok).toBe(true)
  })
})

describe('delivery IPC guards (owner)', () => {
  beforeEach(() => {
    registerIpcHandlers(db, authWith('owner'))
  })

  it('allows sales:list for the owner even when access is off', async () => {
    const result = await call('sales:list', { status: 'ordered' })
    expect(result.ok).toBe(true)
  })

  it('allows sales:setStatus for the owner even when access is off', async () => {
    db.prepare(`INSERT INTO users (username, password_hash, role) VALUES ('Kamel', 'x', 'owner')`).run()
    db.prepare(`INSERT INTO sales (customer_id, created_by, status) VALUES (NULL, 1, 'ordered')`).run()
    const result = await call('sales:setStatus', { saleId: 1, status: 'delivered' })
    expect(result.ok).toBe(true)
  })
})

describe('stock input validation (owner)', () => {
  beforeEach(() => {
    registerIpcHandlers(db, authWith('owner'))
  })

  it('rejects restock with zero or negative quantity', async () => {
    const zero = await call('stock:restock', { productVariantId: 1, quantity: 0 })
    expect(zero.ok).toBe(false)
    expect(zero.error?.code).toBe('VALIDATION_ERROR')
    const negative = await call('stock:restock', { productVariantId: 1, quantity: -1 })
    expect(negative.ok).toBe(false)
    expect(negative.error?.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a zero stock adjustment', async () => {
    const result = await call('stock:adjust', { productVariantId: 1, change: 0, reason: 'test' })
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })
})
