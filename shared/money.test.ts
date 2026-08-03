import { describe, expect, it } from 'vitest'
import { depositFromPercentage, lineTotal, remainingBalance, saleTotal } from './money'

describe('money math', () => {
  it('computes line and sale totals', () => {
    const lines = [
      { quantity: 2, unitPrice: 45000 },
      { quantity: 1, unitPrice: 12000 },
    ]
    expect(lineTotal(lines[0])).toBe(90000)
    expect(saleTotal(lines)).toBe(102000)
  })

  it('rounds deposit percentages to the nearest dinar', () => {
    expect(depositFromPercentage(100000, 30)).toBe(30000)
    expect(depositFromPercentage(33333, 30)).toBe(10000)
    expect(depositFromPercentage(100000, 50)).toBe(50000)
  })

  it('remaining balance is total minus paid and never negative', () => {
    expect(remainingBalance(100000, 30000)).toBe(70000)
    expect(remainingBalance(100000, 100000)).toBe(0)
    expect(remainingBalance(100000, 120000)).toBe(0)
  })
})
