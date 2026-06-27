'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useData } from '@/context/data-context'
import {
  formatCurrency,
  filterTransactionsByMonth,
  totalByType,
  startOfMonth,
  clamp,
} from '@/lib/utils'
import { CATEGORY_COLORS } from '@/lib/constants'
import type { Budget } from '@/types/models'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'

function AddBudgetModal({
  onClose,
  currentMonth,
}: {
  onClose: () => void
  currentMonth: Date
}) {
  const { categories, addOrUpdateBudget } = useData()
  const [categoryId, setCategoryId] = useState('')
  const [limit, setLimit] = useState('')
  const [loading, setLoading] = useState(false)

  const expenseCategories = categories.filter((c) => c.type === 'Gasto')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedLimit = parseFloat(limit)
    if (!categoryId || isNaN(parsedLimit) || parsedLimit <= 0) return
    setLoading(true)
    try {
      await addOrUpdateBudget(categoryId, parsedLimit, startOfMonth(currentMonth))
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Nuevo presupuesto</h2>
          <button onClick={onClose} className="text-2xl text-text-muted leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text outline-none focus:border-primary"
          >
            <option value="">Selecciona categoría</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <input
            type="number"
            required
            min="1"
            step="0.01"
            placeholder="Límite mensual (COP)"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Guardando…' : 'Agregar presupuesto'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function PresupuestosPage() {
  const { transactions, categories, budgets, deleteBudget, loading } = useData()
  const [currentMonth] = useState(new Date())
  const [showAdd, setShowAdd] = useState(false)

  const monthTx = useMemo(
    () => filterTransactionsByMonth(transactions, currentMonth),
    [transactions, currentMonth],
  )

  const monthBudgets = useMemo(
    () =>
      budgets.filter((b) => {
        const ms = new Date(b.monthStart)
        return (
          ms.getFullYear() === currentMonth.getFullYear() &&
          ms.getMonth() === currentMonth.getMonth()
        )
      }),
    [budgets, currentMonth],
  )

  const budgetData = useMemo(
    () =>
      monthBudgets.map((b) => {
        const cat = categories.find((c) => c.id === b.categoryId)
        const spent = monthTx
          .filter((t) => t.type === 'Gasto' && t.categoryId === b.categoryId)
          .reduce((s, t) => s + t.amount, 0)
        const progress = clamp(spent / b.limitAmount, 0, 1)
        return { budget: b, cat, spent, progress }
      }),
    [monthBudgets, categories, monthTx],
  )

  // Top-6 expense categories for bar chart
  const topCategories = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of monthTx) {
      if (tx.type === 'Gasto' && tx.categoryId) {
        map[tx.categoryId] = (map[tx.categoryId] ?? 0) + tx.amount
      }
    }
    return Object.entries(map)
      .map(([catId, amount]) => ({
        catId,
        amount,
        name: categories.find((c) => c.id === catId)?.name ?? 'Otro',
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
  }, [monthTx, categories])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Presupuestos</h1>
          <p className="text-xs text-text-muted capitalize">
            {new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(currentMonth)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/metas" className="text-sm font-semibold text-primary">Metas 🎯</Link>
          <Link href="/pagos" className="text-sm font-semibold text-primary">Pagos 💳</Link>
          <button
            onClick={() => setShowAdd(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white text-xl shadow"
          >
            +
          </button>
        </div>
      </div>

      {/* Top categories bar chart */}
      {topCategories.length > 0 && (
        <div className="rounded-2xl bg-surface p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium text-text-muted">Top gastos del mes</p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={topCategories} barSize={22}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis hide />
              <Tooltip formatter={(v: unknown) => typeof v === 'number' ? formatCurrency(v) : ''} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {topCategories.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Budget cards */}
      {budgetData.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-4xl">🎯</p>
          <p className="mt-2 text-sm text-text-muted">Sin presupuestos este mes</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 text-sm font-semibold text-primary">
            Crear presupuesto
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-muted">
            {budgetData.length} presupuesto{budgetData.length !== 1 ? 's' : ''} activo{budgetData.length !== 1 ? 's' : ''}
          </p>
          {budgetData.map(({ budget, cat, spent, progress }) => {
            const over = spent > budget.limitAmount
            return (
              <div key={budget.id} className="rounded-2xl bg-surface p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat?.icon ?? '📋'}</span>
                    <div>
                      <p className="font-medium text-text">{cat?.name ?? 'Sin categoría'}</p>
                      <p className="text-xs text-text-muted">
                        {formatCurrency(spent)} de {formatCurrency(budget.limitAmount)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        over ? 'bg-expense-light text-expense' : progress >= 0.8 ? 'bg-amber-100 text-amber-700' : 'bg-income-light text-income'
                      }`}
                    >
                      {over ? 'Excedido' : progress >= 0.8 ? 'Casi' : 'OK'}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm('¿Eliminar este presupuesto?')) deleteBudget(budget.id)
                      }}
                      className="text-text-muted"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-border">
                  <div
                    className={`h-full rounded-full transition-all ${over ? 'bg-expense' : progress >= 0.8 ? 'bg-amber-400' : 'bg-income'}`}
                    style={{ width: `${Math.min(progress * 100, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-text-muted">
                  {(progress * 100).toFixed(0)}% usado
                </p>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && <AddBudgetModal currentMonth={currentMonth} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
