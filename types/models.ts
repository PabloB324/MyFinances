export type TransactionType = 'Ingreso' | 'Gasto'
export type SavingsFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly'
export type PaymentRecurrence = 'monthly' | 'bimonthly' | 'quarterly' | 'yearly'
export type PaymentReminder = 'sameDay' | 'oneDayBefore' | 'threeDaysBefore' | 'oneWeekBefore'
export type ScheduledPaymentStatus = 'pending' | 'dueSoon' | 'dueToday' | 'overdue' | 'paid'
export type ColorName = 'income' | 'expense'

export interface Transaction {
  id: string
  title: string
  amount: number
  date: Date
  type: TransactionType
  categoryId: string | null
  notes: string
}

export interface Category {
  id: string
  name: string
  icon: string
  colorName: ColorName
  type: TransactionType
}

export interface Budget {
  id: string
  categoryId: string | null
  limitAmount: number
  monthStart: Date
}

export interface SavingsGoal {
  id: string
  name: string
  icon: string
  targetAmount: number
  deadline: Date
  frequency: SavingsFrequency
  createdDate: Date
  savedAmount: number
  lastContributionDate: Date | null
}

export interface SavingsContribution {
  id: string
  goalId: string
  amount: number
  date: Date
}

export interface ScheduledPayment {
  id: string
  name: string
  icon: string
  amount: number
  dueDate: Date
  isRecurring: boolean
  recurrence: PaymentRecurrence | null
  reminder: PaymentReminder
  notes: string
  isPaid: boolean
  paidDate: Date | null
  paidAmount: number | null
  createdDate: Date
}

export interface GroupInfo {
  id: string
  name: string
  code: string
  createdBy: string
  createdAt: Date
  members: string[]
  memberNames: Record<string, string>
  memberPhotoURLs: Record<string, string>
}

export interface GroupTransaction {
  id: string
  title: string
  amount: number
  date: Date
  type: TransactionType
  categoryId: string | null
  createdByUid: string
  createdByName: string
}

export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL: string | null
  groupId: string | null
}

export interface FinancialScore {
  total: number
  savings: number
  payments: number
  goals: number
  activity: number
}

export interface MarkAsPaidPayload {
  paidAmount: number
  paidDate: Date
  createTransaction: boolean
}
