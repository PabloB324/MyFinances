import type { ScheduledPayment } from '@/types/models'
import { getPaymentStatus, addDays } from '@/lib/utils'

export function groupPaymentsByStatus(payments: ScheduledPayment[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenDaysFromNow = addDays(today, 7)

  const overdue: ScheduledPayment[] = []
  const upcoming: ScheduledPayment[] = []
  const thisMonth: ScheduledPayment[] = []
  const paid: ScheduledPayment[] = []

  for (const p of payments) {
    const status = getPaymentStatus(p)
    if (status === 'paid') {
      paid.push(p)
      continue
    }

    const due = new Date(p.dueDate)
    due.setHours(0, 0, 0, 0)

    if (due < today) {
      overdue.push(p)
    } else if (due <= sevenDaysFromNow) {
      upcoming.push(p)
    } else {
      thisMonth.push(p)
    }
  }

  overdue.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  upcoming.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  thisMonth.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  return { overdue, upcoming, thisMonth, paid }
}

export function dashboardPayments(payments: ScheduledPayment[]): ScheduledPayment[] {
  const { overdue, upcoming } = groupPaymentsByStatus(payments)
  return [...overdue, ...upcoming].slice(0, 5)
}

export function monthlyPaymentsTotal(payments: ScheduledPayment[], month: Date): number {
  return payments
    .filter((p) => {
      const due = new Date(p.dueDate)
      return due.getMonth() === month.getMonth() && due.getFullYear() === month.getFullYear()
    })
    .reduce((sum, p) => sum + p.amount, 0)
}
