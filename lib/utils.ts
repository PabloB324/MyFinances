import type { Transaction, ScheduledPayment, ScheduledPaymentStatus } from '@/types/models'
import { REMINDER_DAYS, RECURRENCE_MONTHS } from '@/lib/constants'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const opts: Intl.DateTimeFormatOptions = options ?? {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }
  return new Intl.DateTimeFormat('es-CO', opts).format(date)
}

export function formatShortDate(date: Date): string {
  return formatDate(date, { day: 'numeric', month: 'short' })
}

export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(date)
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export function getPaymentStatus(payment: ScheduledPayment): ScheduledPaymentStatus {
  if (payment.isPaid) return 'paid'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(payment.dueDate)
  due.setHours(0, 0, 0, 0)

  const diff = daysBetween(today, due)

  if (diff < 0) return 'overdue'
  if (diff === 0) return 'dueToday'
  if (diff <= 7) return 'dueSoon'
  return 'pending'
}

export function getNextRecurrenceDate(payment: ScheduledPayment): Date | null {
  if (!payment.isRecurring || !payment.recurrence) return null
  const months = RECURRENCE_MONTHS[payment.recurrence] ?? 1
  return addMonths(payment.dueDate, months)
}

export function getReminderDate(payment: ScheduledPayment): Date {
  const days = REMINDER_DAYS[payment.reminder] ?? 0
  return addDays(payment.dueDate, -days)
}

export function filterTransactionsByMonth(transactions: Transaction[], month: Date): Transaction[] {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  return transactions.filter((t) => {
    const d = new Date(t.date)
    return d >= start && d <= end
  })
}

export function totalByType(transactions: Transaction[], type: 'Ingreso' | 'Gasto'): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + t.amount, 0)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function generateGroupCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
