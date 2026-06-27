'use client'

import { useMemo, useState } from 'react'
import { useData } from '@/context/data-context'
import {
  formatCurrency,
  filterTransactionsByMonth,
  totalByType,
} from '@/lib/utils'
import { CATEGORY_COLORS } from '@/lib/constants'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts'

export default function ResumenPage() {
  const { transactions, categories, loading } = useData()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthTx = useMemo(
    () => filterTransactionsByMonth(transactions, currentMonth),
    [transactions, currentMonth],
  )

  const monthIncome = useMemo(() => totalByType(monthTx, 'Ingreso'), [monthTx])
  const monthExpense = useMemo(() => totalByType(monthTx, 'Gasto'), [monthTx])
  const balance = monthIncome - monthExpense
  const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0

  const categoryData = useMemo(() => {
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
        name: categories.find((c) => c.id === catId)?.name ?? 'Sin categoría',
        icon: categories.find((c) => c.id === catId)?.icon ?? '📋',
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [monthTx, categories])

  function changeMonth(delta: number) {
    setCurrentMonth((prev) => {
      const next = new Date(prev)
      next.setMonth(next.getMonth() + delta)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 pt-6">
      <h1 className="text-xl font-bold text-text">Resumen mensual</h1>

      {/* Month selector */}
      <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 shadow-sm">
        <button onClick={() => changeMonth(-1)} className="p-1 text-text-muted">‹</button>
        <span className="font-semibold text-text capitalize">
          {new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(currentMonth)}
        </span>
        <button onClick={() => changeMonth(1)} className="p-1 text-text-muted">›</button>
      </div>

      {/* Balance card */}
      <div className={`rounded-2xl p-5 text-white shadow ${balance >= 0 ? 'bg-income' : 'bg-expense'}`}>
        <p className="text-sm opacity-80">Balance del mes</p>
        <p className="mt-1 text-3xl font-bold">{formatCurrency(balance)}</p>
        {monthIncome > 0 && (
          <p className="mt-1 text-sm opacity-80">
            Tasa de ahorro: {savingsRate.toFixed(1)}%
          </p>
        )}
      </div>

      {/* Income / Expense cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-income-light text-lg">💰</div>
            <p className="text-sm text-text-muted">Ingresos</p>
          </div>
          <p className="mt-2 text-xl font-bold text-income">{formatCurrency(monthIncome)}</p>
          <p className="text-xs text-text-muted">{monthTx.filter((t) => t.type === 'Ingreso').length} transacciones</p>
        </div>
        <div className="rounded-2xl bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-expense-light text-lg">💸</div>
            <p className="text-sm text-text-muted">Gastos</p>
          </div>
          <p className="mt-2 text-xl font-bold text-expense">{formatCurrency(monthExpense)}</p>
          <p className="text-xs text-text-muted">{monthTx.filter((t) => t.type === 'Gasto').length} transacciones</p>
        </div>
      </div>

      {/* Category bar chart */}
      {categoryData.length > 0 && (
        <>
          <div className="rounded-2xl bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-text-muted">Gastos por categoría</p>
            <ResponsiveContainer width="100%" height={Math.max(categoryData.length * 36, 100)}>
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ left: 8, right: 8 }}
                barSize={20}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v: unknown) => typeof v === 'number' ? formatCurrency(v) : ''} />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category list */}
          <div className="rounded-2xl bg-surface shadow-sm overflow-hidden divide-y divide-border">
            {categoryData.map((cat, i) => (
              <div key={cat.catId} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                />
                <span className="text-lg">{cat.icon}</span>
                <span className="flex-1 text-sm text-text">{cat.name}</span>
                <span className="text-sm font-semibold text-expense">{formatCurrency(cat.amount)}</span>
                {monthExpense > 0 && (
                  <span className="text-xs text-text-muted w-10 text-right">
                    {((cat.amount / monthExpense) * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {categoryData.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-4xl">📊</p>
          <p className="mt-2 text-sm text-text-muted">Sin gastos este mes</p>
        </div>
      )}
    </div>
  )
}
