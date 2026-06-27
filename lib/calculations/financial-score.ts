import type { Transaction, SavingsGoal, ScheduledPayment, FinancialScore } from '@/types/models'
import { totalByType, filterTransactionsByMonth, clamp, daysBetween } from '@/lib/utils'
import { SCORE_WEIGHTS } from '@/lib/constants'

function savingsScore(transactions: Transaction[]): number {
  const now = new Date()
  const monthly = filterTransactionsByMonth(transactions, now)
  const income = totalByType(monthly, 'Ingreso')
  const expense = totalByType(monthly, 'Gasto')

  if (income === 0) return 0

  const savingsRate = clamp((income - expense) / income, 0, 1)

  if (savingsRate >= 0.3) return SCORE_WEIGHTS.savings
  if (savingsRate >= 0.2) return Math.round(SCORE_WEIGHTS.savings * 0.85)
  if (savingsRate >= 0.1) return Math.round(SCORE_WEIGHTS.savings * 0.65)
  if (savingsRate > 0) return Math.round(SCORE_WEIGHTS.savings * 0.35)
  return 0
}

function paymentsScore(payments: ScheduledPayment[]): number {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recent = payments.filter((p) => new Date(p.dueDate) >= thirtyDaysAgo)
  if (recent.length === 0) return SCORE_WEIGHTS.payments

  const overdue = recent.filter((p) => {
    const due = new Date(p.dueDate)
    return !p.isPaid && due < now
  })

  const ratio = 1 - overdue.length / recent.length
  return Math.round(clamp(ratio, 0, 1) * SCORE_WEIGHTS.payments)
}

function goalsScore(goals: SavingsGoal[]): number {
  const active = goals.filter((g) => g.savedAmount < g.targetAmount)
  if (active.length === 0) return goals.length > 0 ? SCORE_WEIGHTS.goals : 0

  const avgProgress =
    active.reduce((sum, g) => sum + clamp(g.savedAmount / g.targetAmount, 0, 1), 0) /
    active.length

  return Math.round(avgProgress * SCORE_WEIGHTS.goals)
}

function activityScore(transactions: Transaction[]): number {
  const now = new Date()
  const monthly = filterTransactionsByMonth(transactions, now)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysElapsed = Math.max(now.getDate(), 1)

  const expectedTxPerDay = 1
  const expected = expectedTxPerDay * daysElapsed
  const ratio = clamp(monthly.length / expected, 0, 1)

  if (monthly.length === 0) return 0
  if (monthly.length >= daysInMonth) return SCORE_WEIGHTS.activity

  return Math.round(ratio * SCORE_WEIGHTS.activity)
}

export function calculateFinancialScore(
  transactions: Transaction[],
  goals: SavingsGoal[],
  payments: ScheduledPayment[],
): FinancialScore {
  const savings = savingsScore(transactions)
  const paymentsVal = paymentsScore(payments)
  const goalsVal = goalsScore(goals)
  const activity = activityScore(transactions)

  return {
    total: savings + paymentsVal + goalsVal + activity,
    savings,
    payments: paymentsVal,
    goals: goalsVal,
    activity,
  }
}
