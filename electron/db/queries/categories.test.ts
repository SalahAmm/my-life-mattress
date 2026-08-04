// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../connection'
import {
  activeCategoryCount,
  createCategory,
  deactivateCategory,
  listActiveCategories,
  listAllCategories,
  listCategories,
  nextCategorySortOrder,
  reactivateCategory,
  renameCategory,
  seedDefaultCategories,
  tryDeactivateCategory,
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

  it('listAllCategories returns active and inactive categories', () => {
    const db = createDatabase(':memory:')
    const id = createCategory(db, { name: 'Oreiller', sortOrder: 1 })
    deactivateCategory(db, id)
    expect(listAllCategories(db)).toHaveLength(1)
    expect(listAllCategories(db)[0].active).toBe(false)
    expect(listActiveCategories(db)).toHaveLength(0)
  })

  it('reactivates a soft-deleted category', () => {
    const db = createDatabase(':memory:')
    const id = createCategory(db, { name: 'Oreiller', sortOrder: 1 })
    deactivateCategory(db, id)
    reactivateCategory(db, id)
    expect(listActiveCategories(db).map((c) => c.id)).toEqual([id])
  })

  it('nextCategorySortOrder appends after the current maximum', () => {
    const db = createDatabase(':memory:')
    seedDefaultCategories(db)
    expect(nextCategorySortOrder(db)).toBe(3)
    createCategory(db, { name: 'Oreiller', sortOrder: nextCategorySortOrder(db) })
    expect(nextCategorySortOrder(db)).toBe(4)
  })

  it('tryDeactivateCategory refuses to deactivate the last active category', () => {
    const db = createDatabase(':memory:')
    const a = createCategory(db, { name: 'A', sortOrder: 0 })
    const b = createCategory(db, { name: 'B', sortOrder: 1 })
    expect(tryDeactivateCategory(db, a)).toBe(true)
    expect(activeCategoryCount(db)).toBe(1)
    expect(tryDeactivateCategory(db, b)).toBe(false)
    expect(activeCategoryCount(db)).toBe(1)
    expect(listActiveCategories(db).map((c) => c.id)).toEqual([b])
  })
})
