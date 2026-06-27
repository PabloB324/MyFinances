'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/auth-context'
import type {
  Transaction, Category, Budget, SavingsGoal,
  SavingsContribution, ScheduledPayment, MarkAsPaidPayload,
  TransactionType, ColorName,
} from '@/types/models'
import { DEFAULT_CATEGORIES } from '@/lib/constants'
import { getNextRecurrenceDate } from '@/lib/utils'

function localDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ─── Row → Model converters ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function txFromRow(r: any): Transaction {
  return {
    id: r.id,
    title: r.title,
    amount: Number(r.amount),
    date: new Date(r.date),
    type: r.type as TransactionType,
    categoryId: r.category_id ?? null,
    notes: r.notes ?? '',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function catFromRow(r: any): Category {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    colorName: r.color_name as ColorName,
    type: r.type as TransactionType,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function budgetFromRow(r: any): Budget {
  return {
    id: r.id,
    categoryId: r.category_id ?? null,
    limitAmount: Number(r.limit_amount),
    monthStart: new Date(r.month_start + 'T12:00:00'),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function goalFromRow(r: any): SavingsGoal {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    targetAmount: Number(r.target_amount),
    savedAmount: Number(r.saved_amount),
    deadline: new Date(r.deadline),
    frequency: r.frequency,
    createdDate: new Date(r.created_at),
    lastContributionDate: r.last_contribution_date ? new Date(r.last_contribution_date) : null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function contribFromRow(r: any): SavingsContribution {
  return { id: r.id, goalId: r.goal_id, amount: Number(r.amount), date: new Date(r.date) }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function paymentFromRow(r: any): ScheduledPayment {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    amount: Number(r.amount),
    dueDate: new Date(r.due_date),
    isRecurring: r.is_recurring,
    recurrence: r.recurrence ?? null,
    reminder: r.reminder,
    notes: r.notes ?? '',
    isPaid: r.is_paid,
    paidDate: r.paid_date ? new Date(r.paid_date) : null,
    paidAmount: r.paid_amount != null ? Number(r.paid_amount) : null,
    createdDate: new Date(r.created_at),
  }
}

// ─── Context type ────────────────────────────────────────────────────────────

interface DataContextValue {
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  goals: SavingsGoal[]
  contributions: SavingsContribution[]
  payments: ScheduledPayment[]
  loading: boolean

  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>
  updateTransaction: (id: string, t: Partial<Omit<Transaction, 'id'>>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>

  addCategory: (c: Omit<Category, 'id'>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>

  addBudget: (b: Omit<Budget, 'id'>) => Promise<void>
  updateBudget: (id: string, b: Partial<Omit<Budget, 'id'>>) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
  addOrUpdateBudget: (categoryId: string, limitAmount: number, monthStart: Date) => Promise<void>

  addGoal: (g: Omit<SavingsGoal, 'id'>) => Promise<void>
  updateGoal: (id: string, g: Partial<Omit<SavingsGoal, 'id'>>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  addContribution: (goalId: string, amount: number) => Promise<void>

  addPayment: (p: Omit<ScheduledPayment, 'id'>) => Promise<void>
  updatePayment: (id: string, p: Partial<Omit<ScheduledPayment, 'id'>>) => Promise<void>
  deletePayment: (id: string) => Promise<void>
  markAsPaid: (paymentId: string, payload: MarkAsPaidPayload) => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

// ─── Provider ────────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [contributions, setContributions] = useState<SavingsContribution[]>([])
  const [payments, setPayments] = useState<ScheduledPayment[]>([])
  const [loading, setLoading] = useState(true)
  const seededRef = useRef(false)

  const fetchAll = useCallback(async (uid: string) => {
    const [txRes, catRes, budRes, goalRes, contribRes, payRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', uid).order('date', { ascending: false }),
      supabase.from('categories').select('*').eq('user_id', uid).order('name'),
      supabase.from('budgets').select('*').eq('user_id', uid),
      supabase.from('savings_goals').select('*').eq('user_id', uid),
      supabase.from('savings_contributions').select('*').eq('user_id', uid).order('date', { ascending: false }),
      supabase.from('scheduled_payments').select('*').eq('user_id', uid).order('due_date'),
    ])

    const cats = (catRes.data ?? []).map(catFromRow)

    if (cats.length === 0 && !seededRef.current) {
      seededRef.current = true
      await seedCategories(uid)
      const seeded = await supabase.from('categories').select('*').eq('user_id', uid)
      setCategories((seeded.data ?? []).map(catFromRow))
    } else {
      setCategories(cats)
    }

    setTransactions((txRes.data ?? []).map(txFromRow))
    setBudgets((budRes.data ?? []).map(budgetFromRow))
    setGoals((goalRes.data ?? []).map(goalFromRow))
    setContributions((contribRes.data ?? []).map(contribFromRow))
    setPayments((payRes.data ?? []).map(paymentFromRow))
    setLoading(false)
  }, [])

  async function seedCategories(uid: string) {
    await supabase.from('categories').insert(
      DEFAULT_CATEGORIES.map((c) => ({
        user_id: uid,
        name: c.name,
        icon: c.icon,
        color_name: c.colorName,
        type: c.type,
      })),
    )
  }

  useEffect(() => {
    if (!user) {
      setTransactions([]); setCategories([]); setBudgets([])
      setGoals([]); setContributions([]); setPayments([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetchAll(user.id)
  }, [user, fetchAll])

  // ─── Transactions ───────────────────────────────────────────────────────────

  async function addTransaction(t: Omit<Transaction, 'id'>) {
    const { data, error } = await supabase.from('transactions').insert({
      user_id: user!.id,
      title: t.title,
      amount: t.amount,
      date: t.date.toISOString(),
      type: t.type,
      category_id: t.categoryId,
      notes: t.notes,
    }).select().single()
    if (error) throw error
    setTransactions((prev) => [txFromRow(data), ...prev])
  }

  async function updateTransaction(id: string, t: Partial<Omit<Transaction, 'id'>>) {
    const patch: Record<string, unknown> = {}
    if (t.title !== undefined) patch.title = t.title
    if (t.amount !== undefined) patch.amount = t.amount
    if (t.date !== undefined) patch.date = t.date.toISOString()
    if (t.type !== undefined) patch.type = t.type
    if (t.categoryId !== undefined) patch.category_id = t.categoryId
    if (t.notes !== undefined) patch.notes = t.notes

    const { data, error } = await supabase.from('transactions').update(patch).eq('id', id).select().single()
    if (error) throw error
    setTransactions((prev) => prev.map((tx) => tx.id === id ? txFromRow(data) : tx))
  }

  async function deleteTransaction(id: string) {
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions((prev) => prev.filter((tx) => tx.id !== id))
  }

  // ─── Categories ─────────────────────────────────────────────────────────────

  async function addCategory(c: Omit<Category, 'id'>) {
    const { data, error } = await supabase.from('categories').insert({
      user_id: user!.id,
      name: c.name,
      icon: c.icon,
      color_name: c.colorName,
      type: c.type,
    }).select().single()
    if (error) throw error
    setCategories((prev) => [...prev, catFromRow(data)])
  }

  async function deleteCategory(id: string) {
    await supabase.from('categories').delete().eq('id', id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  // ─── Budgets ─────────────────────────────────────────────────────────────────

  async function addBudget(b: Omit<Budget, 'id'>) {
    const { data, error } = await supabase.from('budgets').insert({
      user_id: user!.id,
      category_id: b.categoryId,
      limit_amount: b.limitAmount,
      month_start: localDateStr(b.monthStart),
    }).select().single()
    if (error) throw error
    setBudgets((prev) => [...prev, budgetFromRow(data)])
  }

  async function updateBudget(id: string, b: Partial<Omit<Budget, 'id'>>) {
    const patch: Record<string, unknown> = {}
    if (b.limitAmount !== undefined) patch.limit_amount = b.limitAmount
    if (b.categoryId !== undefined) patch.category_id = b.categoryId
    const { data, error } = await supabase.from('budgets').update(patch).eq('id', id).select().single()
    if (error) throw error
    setBudgets((prev) => prev.map((bud) => bud.id === id ? budgetFromRow(data) : bud))
  }

  async function deleteBudget(id: string) {
    await supabase.from('budgets').delete().eq('id', id)
    setBudgets((prev) => prev.filter((b) => b.id !== id))
  }

  async function addOrUpdateBudget(categoryId: string, limitAmount: number, monthStart: Date) {
    const monthStr = localDateStr(monthStart).slice(0, 7)
    const existing = budgets.find(
      (b) => b.categoryId === categoryId &&
        localDateStr(new Date(b.monthStart)).slice(0, 7) === monthStr,
    )
    if (existing) {
      await updateBudget(existing.id, { limitAmount })
    } else {
      await addBudget({ categoryId, limitAmount, monthStart })
    }
  }

  // ─── Goals ───────────────────────────────────────────────────────────────────

  async function addGoal(g: Omit<SavingsGoal, 'id'>) {
    const { data, error } = await supabase.from('savings_goals').insert({
      user_id: user!.id,
      name: g.name,
      icon: g.icon,
      target_amount: g.targetAmount,
      saved_amount: g.savedAmount,
      deadline: g.deadline.toISOString().slice(0, 10),
      frequency: g.frequency,
      last_contribution_date: g.lastContributionDate?.toISOString() ?? null,
    }).select().single()
    if (error) throw error
    setGoals((prev) => [...prev, goalFromRow(data)])
  }

  async function updateGoal(id: string, g: Partial<Omit<SavingsGoal, 'id'>>) {
    const patch: Record<string, unknown> = {}
    if (g.name !== undefined) patch.name = g.name
    if (g.icon !== undefined) patch.icon = g.icon
    if (g.targetAmount !== undefined) patch.target_amount = g.targetAmount
    if (g.savedAmount !== undefined) patch.saved_amount = g.savedAmount
    if (g.deadline !== undefined) patch.deadline = g.deadline.toISOString().slice(0, 10)
    if (g.frequency !== undefined) patch.frequency = g.frequency
    if (g.lastContributionDate !== undefined) patch.last_contribution_date = g.lastContributionDate?.toISOString() ?? null
    const { data, error } = await supabase.from('savings_goals').update(patch).eq('id', id).select().single()
    if (error) throw error
    setGoals((prev) => prev.map((goal) => goal.id === id ? goalFromRow(data) : goal))
  }

  async function deleteGoal(id: string) {
    await supabase.from('savings_goals').delete().eq('id', id)
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  async function addContribution(goalId: string, amount: number) {
    const goal = goals.find((g) => g.id === goalId)
    if (!goal) return
    const now = new Date()

    const { error: contribError } = await supabase.from('savings_contributions').insert({
      user_id: user!.id,
      goal_id: goalId,
      amount,
      date: now.toISOString(),
    })
    if (contribError) throw contribError

    const newSaved = goal.savedAmount + amount
    await supabase.from('savings_goals').update({
      saved_amount: newSaved,
      last_contribution_date: now.toISOString(),
    }).eq('id', goalId)

    setContributions((prev) => [{ id: crypto.randomUUID(), goalId, amount, date: now }, ...prev])
    setGoals((prev) => prev.map((g) => g.id === goalId
      ? { ...g, savedAmount: newSaved, lastContributionDate: now }
      : g))
  }

  // ─── Payments ────────────────────────────────────────────────────────────────

  async function addPayment(p: Omit<ScheduledPayment, 'id'>) {
    const { data, error } = await supabase.from('scheduled_payments').insert({
      user_id: user!.id,
      name: p.name,
      icon: p.icon,
      amount: p.amount,
      due_date: p.dueDate.toISOString().slice(0, 10),
      is_recurring: p.isRecurring,
      recurrence: p.recurrence,
      reminder: p.reminder,
      notes: p.notes,
      is_paid: p.isPaid,
      paid_date: p.paidDate?.toISOString().slice(0, 10) ?? null,
      paid_amount: p.paidAmount,
    }).select().single()
    if (error) throw error
    setPayments((prev) => [...prev, paymentFromRow(data)])
  }

  async function updatePayment(id: string, p: Partial<Omit<ScheduledPayment, 'id'>>) {
    const patch: Record<string, unknown> = {}
    if (p.name !== undefined) patch.name = p.name
    if (p.icon !== undefined) patch.icon = p.icon
    if (p.amount !== undefined) patch.amount = p.amount
    if (p.dueDate !== undefined) patch.due_date = p.dueDate.toISOString().slice(0, 10)
    if (p.isRecurring !== undefined) patch.is_recurring = p.isRecurring
    if (p.recurrence !== undefined) patch.recurrence = p.recurrence
    if (p.reminder !== undefined) patch.reminder = p.reminder
    if (p.notes !== undefined) patch.notes = p.notes
    if (p.isPaid !== undefined) patch.is_paid = p.isPaid
    if (p.paidDate !== undefined) patch.paid_date = p.paidDate?.toISOString().slice(0, 10) ?? null
    if (p.paidAmount !== undefined) patch.paid_amount = p.paidAmount
    const { data, error } = await supabase.from('scheduled_payments').update(patch).eq('id', id).select().single()
    if (error) throw error
    setPayments((prev) => prev.map((pay) => pay.id === id ? paymentFromRow(data) : pay))
  }

  async function deletePayment(id: string) {
    await supabase.from('scheduled_payments').delete().eq('id', id)
    setPayments((prev) => prev.filter((p) => p.id !== id))
  }

  async function markAsPaid(paymentId: string, payload: MarkAsPaidPayload) {
    const payment = payments.find((p) => p.id === paymentId)
    if (!payment) return

    await supabase.from('scheduled_payments').update({
      is_paid: true,
      paid_date: payload.paidDate.toISOString().slice(0, 10),
      paid_amount: payload.paidAmount,
    }).eq('id', paymentId)

    setPayments((prev) => prev.map((p) => p.id === paymentId
      ? { ...p, isPaid: true, paidDate: payload.paidDate, paidAmount: payload.paidAmount }
      : p))

    if (payload.createTransaction) {
      await addTransaction({
        title: payment.name,
        amount: payload.paidAmount,
        date: payload.paidDate,
        type: 'Gasto',
        categoryId: null,
        notes: `Pago de: ${payment.name}`,
      })
    }

    if (payment.isRecurring && payment.recurrence) {
      const nextDue = getNextRecurrenceDate(payment)
      if (nextDue) {
        await addPayment({
          ...payment,
          dueDate: nextDue,
          isPaid: false,
          paidDate: null,
          paidAmount: null,
          createdDate: new Date(),
        })
      }
    }
  }

  return (
    <DataContext.Provider value={{
      transactions, categories, budgets, goals, contributions, payments, loading,
      addTransaction, updateTransaction, deleteTransaction,
      addCategory, deleteCategory,
      addBudget, updateBudget, deleteBudget, addOrUpdateBudget,
      addGoal, updateGoal, deleteGoal, addContribution,
      addPayment, updatePayment, deletePayment, markAsPaid,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
