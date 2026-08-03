// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../connection'
import {
  createCategory,
  deactivateCategory,
  listActiveCategories,
  listCategories,
  renameCategory,
  seedDefaultCategories,
} from './categories'

describe('categories queries', () => {
  it('seeds the default categories in order', () => {
    const db = createDatabase(':memory:')
    seedDefaultCategories(db)
    const names = listActiveCategories(db).map((c) => c.name)
    expect(names).toEqual(['Matelas', 'Sommier', 'Accessoires'])
  })

  it('is idempotent', () => {
    const db = createDatabase(':memory:')
    seedDefaultCategories(db)
    seedDefaultCategories(db)
    expect(listCategories(db)).toHaveLength(3)
  })

  it('creates, renames and reorders categories', () => {
    const db = createDatabase(':memory:')
    const id = createCategory(db, { name: 'Oreiller', sortOrder: 4 })
    renameCategory(db, id, 'Coussin')
    expect(listCategories(db).find((c) => c.id === id)?.name).toBe('Coussin')
  })

  it('soft-deletes categories', () => {
    const db = createDatabase(':memory:')
    const id = createCategory(db, { name: 'Oreiller', sortOrder: 1 })
    deactivateCategory(db, id)
    expect(listActiveCategories(db).map((c) => c.name)).toEqual([])
    expect(listCategories(db)).toHaveLength(1)
  })
})
