import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  startOfMonth,
  endOfMonth,
  filterTransactionsByMonth,
  totalByType,
  daysBetween,
  addDays,
  addMonths,
  clamp,
  generateGroupCode,
} from '@/lib/utils'
import type { Transaction } from '@/types/models'

describe('formatCurrency', () => {
  it('formats positive amount in COP', () => {
    const result = formatCurrency(1200000)
    expect(result).toContain('1.200.000')
    expect(result).toContain('$')
  })

  it('formats zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })

  it('formats decimal amount', () => {
    const result = formatCurrency(1500.5)
    expect(result).toContain('1.500')
  })
})

describe('startOfMonth / endOfMonth', () => {
  it('startOfMonth returns day 1 at midnight', () => {
    const d = new Date(2026, 5, 15) // June 15
    const start = startOfMonth(d)
    expect(start.getDate()).toBe(1)
    expect(start.getMonth()).toBe(5)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
  })

  it('endOfMonth returns last day at 23:59:59', () => {
    const d = new Date(2026, 5, 1) // June
    const end = endOfMonth(d)
    expect(end.getDate()).toBe(30)
    expect(end.getMonth()).toBe(5)
  })

  it('endOfMonth works for February in leap year', () => {
    const d = new Date(2024, 1, 1) // Feb 2024 (leap)
    const end = endOfMonth(d)
    expect(end.getDate()).toBe(29)
  })

  it('endOfMonth works for February in non-leap year', () => {
    const d = new Date(2025, 1, 1)
    const end = endOfMonth(d)
    expect(end.getDate()).toBe(28)
  })
})

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: crypto.randomUUID(),
  title: 'Test',
  amount: 1000,
  date: new Date(2026, 5, 15),
  type: 'Ingreso',
  categoryId: null,
  notes: '',
  ...overrides,
})

describe('filterTransactionsByMonth', () => {
  it('includes transactions in the target month', () => {
    const tx = makeTx({ date: new Date(2026, 5, 10) })
    const result = filterTransactionsByMonth([tx], new Date(2026, 5, 1))
    expect(result).toHaveLength(1)
  })

  it('excludes transactions from a different month', () => {
    const tx = makeTx({ date: new Date(2026, 4, 10) }) // May
    const result = filterTransactionsByMonth([tx], new Date(2026, 5, 1)) // June
    expect(result).toHaveLength(0)
  })

  it('excludes transactions from a different year', () => {
    const tx = makeTx({ date: new Date(2025, 5, 10) })
    const result = filterTransactionsByMonth([tx], new Date(2026, 5, 1))
    expect(result).toHaveLength(0)
  })

  it('handles empty array', () => {
    expect(filterTransactionsByMonth([], new Date())).toHaveLength(0)
  })
})

describe('totalByType', () => {
  it('sums incomes correctly', () => {
    const txs = [
      makeTx({ type: 'Ingreso', amount: 3000 }),
      makeTx({ type: 'Ingreso', amount: 2000 }),
      makeTx({ type: 'Gasto', amount: 500 }),
    ]
    expect(totalByType(txs, 'Ingreso')).toBe(5000)
  })

  it('sums expenses correctly', () => {
    const txs = [
      makeTx({ type: 'Gasto', amount: 400 }),
      makeTx({ type: 'Gasto', amount: 600 }),
    ]
    expect(totalByType(txs, 'Gasto')).toBe(1000)
  })

  it('returns 0 when no matching type', () => {
    const txs = [makeTx({ type: 'Ingreso', amount: 1000 })]
    expect(totalByType(txs, 'Gasto')).toBe(0)
  })

  it('returns 0 for empty array', () => {
    expect(totalByType([], 'Ingreso')).toBe(0)
  })
})

describe('daysBetween', () => {
  it('returns positive days when to > from', () => {
    const from = new Date(2026, 5, 1)
    const to = new Date(2026, 5, 11)
    expect(daysBetween(from, to)).toBe(10)
  })

  it('returns 0 for same date', () => {
    const d = new Date(2026, 5, 1)
    expect(daysBetween(d, d)).toBe(0)
  })

  it('returns negative when to < from', () => {
    const from = new Date(2026, 5, 10)
    const to = new Date(2026, 5, 1)
    expect(daysBetween(from, to)).toBeLessThan(0)
  })
})

describe('addDays', () => {
  it('adds positive days', () => {
    const d = new Date(2026, 5, 1)
    const result = addDays(d, 10)
    expect(result.getDate()).toBe(11)
    expect(result.getMonth()).toBe(5)
  })

  it('crosses month boundary', () => {
    const d = new Date(2026, 5, 25) // June 25
    const result = addDays(d, 10)
    expect(result.getMonth()).toBe(6) // July
    expect(result.getDate()).toBe(5)
  })

  it('does not mutate original date', () => {
    const d = new Date(2026, 5, 1)
    addDays(d, 5)
    expect(d.getDate()).toBe(1)
  })
})

describe('addMonths', () => {
  it('adds months correctly', () => {
    const d = new Date(2026, 5, 15)
    const result = addMonths(d, 3)
    expect(result.getMonth()).toBe(8) // September
    expect(result.getFullYear()).toBe(2026)
  })

  it('crosses year boundary', () => {
    const d = new Date(2026, 10, 1) // November
    const result = addMonths(d, 3)
    expect(result.getMonth()).toBe(1) // February
    expect(result.getFullYear()).toBe(2027)
  })
})

describe('clamp', () => {
  it('returns value within range unchanged', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('handles edge values', () => {
    expect(clamp(0, 0, 1)).toBe(0)
    expect(clamp(1, 0, 1)).toBe(1)
  })
})

describe('generateGroupCode', () => {
  it('returns a 6-character uppercase string', () => {
    const code = generateGroupCode()
    expect(code).toHaveLength(6)
    expect(code).toBe(code.toUpperCase())
  })

  it('generates different codes on successive calls', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateGroupCode()))
    expect(codes.size).toBeGreaterThan(15)
  })
})
