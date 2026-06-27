import type { SavingsGoal, SavingsFrequency } from '@/types/models'
import { FREQUENCY_DAYS } from '@/lib/constants'
import { addDays, daysBetween, clamp } from '@/lib/utils'

export function goalProgress(goal: SavingsGoal): number {
  if (goal.targetAmount <= 0) return 0
  return clamp(goal.savedAmount / goal.targetAmount, 0, 1)
}

export function goalIsCompleted(goal: SavingsGoal): boolean {
  return goal.savedAmount >= goal.targetAmount
}

export function goalDaysRemaining(goal: SavingsGoal): number {
  return Math.max(daysBetween(new Date(), new Date(goal.deadline)), 0)
}

export function goalRemaining(goal: SavingsGoal): number {
  return Math.max(goal.targetAmount - goal.savedAmount, 0)
}

export function goalPeriodsRemaining(goal: SavingsGoal): number {
  const days = goalDaysRemaining(goal)
  const periodDays = FREQUENCY_DAYS[goal.frequency] ?? 30
  return Math.max(Math.ceil(days / periodDays), 1)
}

export function goalRequiredQuota(goal: SavingsGoal): number {
  const remaining = goalRemaining(goal)
  const periods = goalPeriodsRemaining(goal)
  return remaining / periods
}

export function goalNextContributionDate(goal: SavingsGoal): Date {
  if (!goal.lastContributionDate) return new Date()
  const periodDays = FREQUENCY_DAYS[goal.frequency] ?? 30
  return addDays(new Date(goal.lastContributionDate), periodDays)
}

export type GoalFeasibility = 'achievable' | 'demanding' | 'insufficient'

export function goalFeasibility(goal: SavingsGoal): GoalFeasibility {
  const quota = goalRequiredQuota(goal)
  if (quota <= 0) return 'achievable'

  const days = goalDaysRemaining(goal)
  const periodDays = FREQUENCY_DAYS[goal.frequency] ?? 30

  if (days < periodDays) return 'insufficient'
  if (quota <= goal.targetAmount * 0.1) return 'achievable'
  if (quota <= goal.targetAmount * 0.2) return 'demanding'
  return 'insufficient'
}

export function goalSuggestedDeadline(goal: SavingsGoal): Date {
  const remaining = goalRemaining(goal)
  const periodDays = FREQUENCY_DAYS[goal.frequency] ?? 30
  const minQuota = goal.targetAmount * 0.1
  const periodsNeeded = Math.ceil(remaining / minQuota)
  return addDays(new Date(), periodsNeeded * periodDays)
}
