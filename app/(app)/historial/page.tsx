'use client'

import { useMemo, useState } from 'react'
import { useData } from '@/context/data-context'
import {
  formatCurrency,
  formatDate,
  filterTransactionsByMonth,
  totalByType,
  startOfMonth,
  endOfMonth,
} from '@/lib/utils'
import type { Transaction } from '@/types/models'
import TransactionModal from '@/components/transactions/transaction-modal'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`
}

function groupByDay(transactions: Transaction[]) {
  const map: Record<string, Transaction[]> = {}
  for (const tx of transactions) {
    const d = new Date(tx.date)
    const key = d.toDateString()
    if (!map[key]) map[key] = []
    map[key].push(tx)
  }
  return Object.entries(map).sort(
    ([a], [b]) => new Date(b).getTime() - new Date(a).getTime(),
  )
}

export default function HistorialPage() {
  const { transactions, categories, loading } = useData()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [search, setSearch] = useState('')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const { deleteTransaction } = useData()

  const monthTx = useMemo(
    () => filterTransactionsByMonth(transactions, currentMonth),
    [transactions, currentMonth],
  )

  const filteredTx = useMemo(() => {
    let base = selectedDay
      ? monthTx.filter((t) => new Date(t.date).toDateString() === selectedDay)
      : monthTx
    if (search.trim()) {
      const q = search.toLowerCase()
      base = base.filter((t) => {
        const cat = categories.find((c) => c.id === t.categoryId)
        return (
          t.title.toLowerCase().includes(q) ||
          cat?.name.toLowerCase().includes(q)
        )
      })
    }
    return base.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [monthTx, selectedDay, search, categories])

  const monthIncome = useMemo(() => totalByType(monthTx, 'Ingreso'), [monthTx])
  const monthExpense = useMemo(() => totalByType(monthTx, 'Gasto'), [monthTx])

  // Bar chart data: income vs expense per day
  const chartData = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const days = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(start)
      d.setDate(i + 1)
      const dayStr = d.toDateString()
      const dayTx = monthTx.filter((t) => new Date(t.date).toDateString() === dayStr)
      return {
        day: i + 1,
        dateStr: dayStr,
        income: totalByType(dayTx, 'Ingreso'),
        expense: totalByType(dayTx, 'Gasto'),
      }
    }).filter((d) => d.income > 0 || d.expense > 0)
  }, [monthTx, currentMonth])

  function changeMonth(delta: number) {
    setCurrentMonth((prev) => {
      const next = new Date(prev)
      next.setMonth(next.getMonth() + delta)
      return next
    })
    setSelectedDay(null)
  }

  const grouped = useMemo(() => groupByDay(filteredTx), [filteredTx])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Historial</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white text-xl shadow"
        >
          +
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 shadow-sm">
        <button onClick={() => changeMonth(-1)} className="p-1 text-text-muted">‹</button>
        <span className="font-semibold text-text capitalize">
          {new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(currentMonth)}
        </span>
        <button onClick={() => changeMonth(1)} className="p-1 text-text-muted">›</button>
      </div>

      {/* Period summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-income-light p-3 text-center">
          <p className="text-xs text-income">Ingresos</p>
          <p className="mt-0.5 text-sm font-bold text-income">{formatCurrency(monthIncome)}</p>
        </div>
        <div className="rounded-xl bg-expense-light p-3 text-center">
          <p className="text-xs text-expense">Gastos</p>
          <p className="mt-0.5 text-sm font-bold text-expense">{formatCurrency(monthExpense)}</p>
        </div>
        <div className="rounded-xl bg-surface p-3 text-center shadow-sm">
          <p className="text-xs text-text-muted">Balance</p>
          <p className={`mt-0.5 text-sm font-bold ${monthIncome - monthExpense >= 0 ? 'text-income' : 'text-expense'}`}>
            {formatCurrency(monthIncome - monthExpense)}
          </p>
        </div>
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="rounded-2xl bg-surface p-4 shadow-sm">
          <p className="mb-2 text-xs text-text-muted">
            {selectedDay ? `Día seleccionado: ${new Date(selectedDay).getDate()}` : 'Toca un día para filtrar'}
          </p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={chartData} barSize={8} onClick={(d) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const payload = (d as any)?.activePayload
              const dateStr: string | undefined = payload?.[0]?.payload?.dateStr
              if (dateStr) setSelectedDay((prev) => prev === dateStr ? null : dateStr)
            }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <Bar dataKey="income" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Tooltip
                formatter={(v: unknown, name: unknown) => [
                  typeof v === 'number' ? formatCurrency(v) : '',
                  name === 'income' ? 'Ingresos' : 'Gastos',
                ]}
              />
            </BarChart>
          </ResponsiveContainer>
          {selectedDay && (
            <button onClick={() => setSelectedDay(null)} className="mt-1 text-xs text-primary">
              Limpiar filtro
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Buscar transacción o categoría…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder-text-muted outline-none focus:border-primary"
      />

      {/* Transaction list */}
      {grouped.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-4xl">📭</p>
          <p className="mt-2 text-sm text-text-muted">Sin transacciones este mes</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 text-sm font-semibold text-primary">
            Agregar transacción
          </button>
        </div>
      ) : (
        grouped.map(([dayStr, txs]) => (
          <div key={dayStr} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              {formatDate(new Date(dayStr), { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <div className="rounded-2xl bg-surface shadow-sm overflow-hidden divide-y divide-border">
              {txs.map((tx) => {
                const cat = categories.find((c) => c.id === tx.categoryId)
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${tx.type === 'Ingreso' ? 'bg-income-light' : 'bg-expense-light'}`}>
                      {cat?.icon ?? (tx.type === 'Ingreso' ? '💰' : '💸')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-text">{tx.title}</p>
                      <p className="text-xs text-text-muted">{cat?.name ?? 'Sin categoría'}</p>
                    </div>
                    <p className={`text-sm font-semibold ${tx.type === 'Ingreso' ? 'text-income' : 'text-expense'}`}>
                      {tx.type === 'Ingreso' ? '+' : '−'}{formatCurrency(tx.amount)}
                    </p>
                    <div className="flex gap-2 ml-2">
                      <button
                        onClick={() => setEditingTx(tx)}
                        className="text-xs text-text-muted"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar "${tx.title}"?`)) deleteTransaction(tx.id)
                        }}
                        className="text-xs text-expense"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {showAdd && <TransactionModal onClose={() => setShowAdd(false)} />}
      {editingTx && (
        <TransactionModal transaction={editingTx} onClose={() => setEditingTx(null)} />
      )}
    </div>
  )
}
