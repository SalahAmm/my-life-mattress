// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../connection'
import { createSupplier, listActiveSuppliers, listSuppliers, setSupplierActive } from './suppliers'

describe('suppliers queries (ticket 08, seam C)', () => {
  it('soft-deactivates a supplier', () => {
    const db = createDatabase(':memory:')
    const id = createSupplier(db, { name: 'Rafik', phone: null })
    setSupplierActive(db, id, false)
    expect(listSuppliers(db).find((s) => s.id === id)?.active).toBe(0)
    expect(listActiveSuppliers(db).map((s) => s.name)).toEqual([])
  })

  it('keeps deactivated suppliers listed for history', () => {
    const db = createDatabase(':memory:')
    const id = createSupplier(db, { name: 'Rafik', phone: null })
    setSupplierActive(db, id, false)
    expect(listSuppliers(db)).toHaveLength(1)
  })
})
