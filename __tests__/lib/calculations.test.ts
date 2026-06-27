import { describe, it, expect } from 'vitest'
import { calculateFinancialScore } from '@/lib/calculations/financial-score'
import {
  goalProgress,
  goalIsCompleted,
  goalDaysRemaining,
  goalRemaining,
  goalRequiredQuota,
  goalFeasibility,
} from '@/lib/calculations/goals'
import {
  groupPaymentsByStatus,
  dashboardPayments,
  monthlyPaymentsTotal,
} from '@/lib/calculations/payments'
import type { Transaction, SavingsGoal, ScheduledPayment } from '@/types/models'

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: crypto.randomUUID(),
  title: 'Test',
  amount: 1000,
  date: new Date(),
  type: 'Ingreso',
  categoryId: null,
  notes: '',
  ...overrides,
})

const makeGoal = (overrides: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: crypto.randomUUID(),
  name: 'Vacaciones',
  icon: '✈️',
  targetAmount: 10000,
  savedAmount: 0,
  deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
  frequency: 'monthly',
  createdDate: new Date(),
  lastContributionDate: null,
  ...overrides,
})

const makePayment = (overrides: Partial<ScheduledPayment> = {}): ScheduledPayment => ({
  id: crypto.randomUUID(),
  name: 'Netflix',
  icon: '📺',
  amount: 200,
  dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
  isRecurring: false,
  recurrence: null,
  reminder: 'none',
  notes: '',
  isPaid: false,
  paidDate: null,
  paidAmount: null,
  createdDate: new Date(),
  ...overrides,
})

// ─── Financial Score ─────────────────────────────────────────────────────────

describe('calculateFinancialScore', () => {
  it('returns correct score when no data', () => {
    const score = calculateFinancialScore([], [], [])
    // No transactions → savings=0, activity=0
    // No payments → payments=30 (no overdue = full score)
    // No goals → goals=0
    expect(score.savings).toBe(0)
    expect(score.activity).toBe(0)
    expect(score.payments).toBe(30)
    expect(score.total).toBe(30)
  })

  it('total equals sum of components', () => {
    const score = calculateFinancialScore([], [], [])
    expect(score.total).toBe(score.savings + score.payments + score.goals + score.activity)
  })

  it('total never exceeds 100', () => {
    const txs = Array.from({ length: 30 }, (_, i) =>
      makeTx({ amount: 5000, type: 'Ingreso', date: new Date() }),
    )
    const goals = [makeGoal({ savedAmount: 9000, targetAmount: 10000 })]
    const payments = [makePayment({ isPaid: true })]
    const score = calculateFinancialScore(txs, goals, payments)
    expect(score.total).toBeLessThanOrEqual(100)
  })

  it('returns full payments score when no payments exist', () => {
    const score = calculateFinancialScore([], [], [])
    expect(score.payments).toBe(30)
  })

  it('reduces payments score for overdue payments', () => {
    const overdue = makePayment({
      isPaid: false,
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    })
    const score = calculateFinancialScore([], [], [overdue])
    expect(score.payments).toBeLessThan(30)
  })

  it('gives goals score based on progress', () => {
    const halfDone = makeGoal({ savedAmount: 5000, targetAmount: 10000 })
    const score = calculateFinancialScore([], [halfDone], [])
    expect(score.goals).toBeGreaterThan(0)
    expect(score.goals).toBeLessThanOrEqual(20)
  })
})

// ─── Goal calculations ───────────────────────────────────────────────────────

describe('goalProgress', () => {
  it('returns 0 when nothing saved', () => {
    expect(goalProgress(makeGoal({ savedAmount: 0 }))).toBe(0)
  })

  it('returns 0.5 at halfway', () => {
    expect(goalProgress(makeGoal({ savedAmount: 5000, targetAmount: 10000 }))).toBe(0.5)
  })

  it('returns 1 when fully saved', () => {
    expect(goalProgress(makeGoal({ savedAmount: 10000, targetAmount: 10000 }))).toBe(1)
  })

  it('clamps to 1 when over-saved', () => {
    expect(goalProgress(makeGoal({ savedAmount: 12000, targetAmount: 10000 }))).toBe(1)
  })

  it('returns 0 for zero target', () => {
    expect(goalProgress(makeGoal({ targetAmount: 0 }))).toBe(0)
  })
})

describe('goalIsCompleted', () => {
  it('false when not fully saved', () => {
    expect(goalIsCompleted(makeGoal({ savedAmount: 9999 }))).toBe(false)
  })

  it('true when exactly at target', () => {
    expect(goalIsCompleted(makeGoal({ savedAmount: 10000, targetAmount: 10000 }))).toBe(true)
  })

  it('true when over target', () => {
    expect(goalIsCompleted(makeGoal({ savedAmount: 11000, targetAmount: 10000 }))).toBe(true)
  })
})

describe('goalDaysRemaining', () => {
  it('returns positive days for future deadline', () => {
    const goal = makeGoal({ deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
    expect(goalDaysRemaining(goal)).toBeGreaterThan(0)
  })

  it('returns 0 for past deadline', () => {
    const goal = makeGoal({ deadline: new Date(Date.now() - 24 * 60 * 60 * 1000) })
    expect(goalDaysRemaining(goal)).toBe(0)
  })
})

describe('goalRemaining', () => {
  it('returns difference between target and saved', () => {
    const goal = makeGoal({ savedAmount: 3000, targetAmount: 10000 })
    expect(goalRemaining(goal)).toBe(7000)
  })

  it('returns 0 when goal completed', () => {
    const goal = makeGoal({ savedAmount: 10000, targetAmount: 10000 })
    expect(goalRemaining(goal)).toBe(0)
  })
})

describe('goalRequiredQuota', () => {
  it('returns positive amount when there is remaining balance', () => {
    const goal = makeGoal({ savedAmount: 0, targetAmount: 10000 })
    expect(goalRequiredQuota(goal)).toBeGreaterThan(0)
  })

  it('returns 0 when goal is complete', () => {
    const goal = makeGoal({ savedAmount: 10000, targetAmount: 10000 })
    expect(goalRequiredQuota(goal)).toBe(0)
  })
})

describe('goalFeasibility', () => {
  it('returns achievable for a completed goal', () => {
    const goal = makeGoal({ savedAmount: 10000, targetAmount: 10000 })
    expect(goalFeasibility(goal)).toBe('achievable')
  })

  it('returns a valid feasibility string', () => {
    const goal = makeGoal()
    const result = goalFeasibility(goal)
    expect(['achievable', 'demanding', 'insufficient']).toContain(result)
  })
})

// ─── Payment calculations ────────────────────────────────────────────────────

describe('groupPaymentsByStatus', () => {
  it('puts paid payments in paid bucket', () => {
    const paid = makePayment({ isPaid: true, paidDate: new Date(), paidAmount: 200 })
    const { paid: paidList } = groupPaymentsByStatus([paid])
    expect(paidList).toHaveLength(1)
  })

  it('puts overdue unpaid payments in overdue bucket', () => {
    const overdue = makePayment({
      isPaid: false,
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    })
    const { overdue: overdueList } = groupPaymentsByStatus([overdue])
    expect(overdueList).toHaveLength(1)
  })

  it('puts payments due within 7 days in upcoming bucket', () => {
    const soon = makePayment({
      isPaid: false,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    })
    const { upcoming } = groupPaymentsByStatus([soon])
    expect(upcoming).toHaveLength(1)
  })

  it('puts far-future payments in thisMonth bucket', () => {
    const far = makePayment({
      isPaid: false,
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    })
    const { thisMonth } = groupPaymentsByStatus([far])
    expect(thisMonth).toHaveLength(1)
  })

  it('handles empty array', () => {
    const result = groupPaymentsByStatus([])
    expect(result.overdue).toHaveLength(0)
    expect(result.upcoming).toHaveLength(0)
    expect(result.thisMonth).toHaveLength(0)
    expect(result.paid).toHaveLength(0)
  })
})

describe('dashboardPayments', () => {
  it('returns at most 5 payments', () => {
    const payments = Array.from({ length: 10 }, () =>
      makePayment({ dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000) }),
    )
    expect(dashboardPayments(payments).length).toBeLessThanOrEqual(5)
  })

  it('prioritizes overdue over upcoming', () => {
    const overdue = makePayment({
      name: 'Overdue',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    })
    const upcoming = makePayment({
      name: 'Upcoming',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    })
    const result = dashboardPayments([upcoming, overdue])
    expect(result[0].name).toBe('Overdue')
  })
})

describe('monthlyPaymentsTotal', () => {
  it('sums payments for the given month', () => {
    const june = new Date(2026, 5, 15)
    const p1 = makePayment({ amount: 500, dueDate: new Date(2026, 5, 1) })
    const p2 = makePayment({ amount: 300, dueDate: new Date(2026, 5, 20) })
    const p3 = makePayment({ amount: 999, dueDate: new Date(2026, 4, 1) }) // May
    expect(monthlyPaymentsTotal([p1, p2, p3], june)).toBe(800)
  })

  it('returns 0 for empty array', () => {
    expect(monthlyPaymentsTotal([], new Date())).toBe(0)
  })
})
