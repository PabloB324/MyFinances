'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { useData } from '@/context/data-context'
import {
  formatCurrency,
  filterTransactionsByMonth,
  totalByType,
} from '@/lib/utils'
import { calculateFinancialScore } from '@/lib/calculations/financial-score'
import { goalProgress, goalDaysRemaining } from '@/lib/calculations/goals'
import { dashboardPayments } from '@/lib/calculations/payments'
import { SCORE_WEIGHTS } from '@/lib/constants'
import TransactionModal from '@/components/transactions/transaction-modal'

function ScoreRing({ score }: { score: number }) {
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const label = score >= 75 ? 'Excelente' : score >= 50 ? 'Regular' : 'Por mejorar'

  return (
    <div className="flex flex-col items-start gap-0.5">
      <p className="text-sm text-text-muted">Score financiero</p>
      <p className="text-lg font-bold" style={{ color }}>{label}</p>
      <div className="mt-1 flex items-center gap-4">
        <div className="relative flex items-center justify-center">
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="8" />
            <circle
              cx="44" cy="44" r={radius} fill="none"
              stroke={color} strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 44 44)"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-xl font-bold" style={{ color }}>{score}</span>
            <span className="text-[10px] text-text-muted">/100</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-xs text-text-muted">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-border">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-text-muted">{value}/{max}</span>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { transactions, goals, payments, categories, loading } = useData()
  const [showTxModal, setShowTxModal] = useState(false)
  const [txType, setTxType] = useState<'Ingreso' | 'Gasto'>('Ingreso')

  const now = useMemo(() => new Date(), [])
  const monthTx = useMemo(() => filterTransactionsByMonth(transactions, now), [transactions, now])
  const totalIncome = useMemo(() => totalByType(transactions, 'Ingreso'), [transactions])
  const totalExpense = useMemo(() => totalByType(transactions, 'Gasto'), [transactions])
  const balance = totalIncome - totalExpense
  const monthIncome = useMemo(() => totalByType(monthTx, 'Ingreso'), [monthTx])
  const monthExpense = useMemo(() => totalByType(monthTx, 'Gasto'), [monthTx])

  const score = useMemo(() => calculateFinancialScore(transactions, goals, payments), [transactions, goals, payments])
  const activeGoals = useMemo(() => goals.filter((g) => g.savedAmount < g.targetAmount).slice(0, 3), [goals])
  const urgentPayments = useMemo(() => dashboardPayments(payments).slice(0, 3), [payments])
  const lastTransactions = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4),
    [transactions],
  )

  function openTx(type: 'Ingreso' | 'Gasto') {
    setTxType(type)
    setShowTxModal(true)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const firstName = user?.displayName?.split(' ')[0] ?? 'Usuario'

  return (
    <div className="space-y-4 px-4 pt-8 pb-2">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Hola, {firstName}</h1>
          <p className="mt-1 text-sm text-text-muted leading-snug max-w-[220px]">
            Controla tus ingresos, gastos y decisiones del mes desde un solo vistazo.
          </p>
        </div>
        <Link href="/perfil">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="h-14 w-14 rounded-full object-cover border-2 border-border" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 border-2 border-primary text-primary text-xl font-bold">
              {firstName[0].toUpperCase()}
            </div>
          )}
        </Link>
      </div>

      {/* Balance card */}
      <div className="rounded-3xl bg-surface p-5 shadow-lg">
        <p className="text-sm text-text-muted">Saldo total</p>
        <p className="mt-1 text-4xl font-bold text-text">{formatCurrency(balance)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface-alt p-3">
            <p className="text-xs text-text-muted">Ingresos</p>
            <p className="mt-1 text-lg font-bold text-income">{formatCurrency(monthIncome)}</p>
          </div>
          <div className="rounded-2xl bg-surface-alt p-3">
            <p className="text-xs text-text-muted">Gastos</p>
            <p className="mt-1 text-lg font-bold text-expense">-{formatCurrency(monthExpense)}</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => openTx('Ingreso')}
          className="rounded-2xl bg-primary py-4 text-base font-bold text-white shadow-lg shadow-primary/30 transition active:scale-95"
        >
          + Ingreso
        </button>
        <button
          onClick={() => openTx('Gasto')}
          className="rounded-2xl bg-surface py-4 text-base font-bold text-text shadow transition active:scale-95"
        >
          - Gasto
        </button>
      </div>

      {/* Score financiero */}
      <div className="rounded-3xl bg-surface p-5 shadow-lg">
        <div className="flex gap-4">
          <ScoreRing score={score.total} />
          <div className="flex flex-1 flex-col justify-center gap-2">
            <ScoreBar label="Ahorro" value={score.savings} max={SCORE_WEIGHTS.savings} color="#10b981" />
            <ScoreBar label="Pagos" value={score.payments} max={SCORE_WEIGHTS.payments} color="#ef4444" />
            <ScoreBar label="Metas" value={score.goals} max={SCORE_WEIGHTS.goals} color="#ef4444" />
            <ScoreBar label="Actividad" value={score.activity} max={SCORE_WEIGHTS.activity} color="#ef4444" />
          </div>
        </div>
      </div>

      {/* Metas activas */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text">Metas activas</h2>
          <Link href="/metas" className="text-sm font-semibold text-primary">Ver todas</Link>
        </div>
        {activeGoals.length === 0 ? (
          <div className="rounded-3xl bg-surface p-5 shadow">
            <p className="font-bold text-text">Aun no tienes metas de ahorro activas</p>
            <p className="mt-1 text-sm text-text-muted">Crea una meta para empezar a seguir tu progreso de ahorro desde aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeGoals.map((goal) => {
              const pct = goalProgress(goal)
              const days = goalDaysRemaining(goal)
              return (
                <div key={goal.id} className="rounded-3xl bg-surface p-4 shadow">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text">{goal.icon} {goal.name}</span>
                    <span className="text-xs text-text-muted">{days}d restantes</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-border">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct * 100}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-text-muted">
                    <span>{formatCurrency(goal.savedAmount)}</span>
                    <span>{formatCurrency(goal.targetAmount)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Próximos pagos */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text">Próximos pagos</h2>
          <Link href="/pagos" className="text-sm font-semibold text-primary">Ver todos</Link>
        </div>
        {urgentPayments.length === 0 ? (
          <div className="rounded-3xl bg-surface p-5 shadow">
            <p className="font-bold text-text">No hay pagos proximos</p>
            <p className="mt-1 text-sm text-text-muted">Programa tus pagos recurrentes para verlos aqui.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {urgentPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-3xl bg-surface px-4 py-3 shadow">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <p className="font-semibold text-text">{p.name}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(p.dueDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <p className="font-bold text-text">{formatCurrency(p.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Últimos movimientos */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text">Últimos movimientos</h2>
          <Link href="/historial" className="text-sm font-semibold text-primary">Ver todos</Link>
        </div>
        {lastTransactions.length === 0 ? (
          <div className="rounded-3xl bg-surface p-5 shadow">
            <p className="font-bold text-text">Sin movimientos aún</p>
            <p className="mt-1 text-sm text-text-muted">Agrega tu primer ingreso o gasto para empezar.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-surface shadow">
            {lastTransactions.map((tx, i) => {
              const cat = categories.find((c) => c.id === tx.categoryId)
              return (
                <div key={tx.id} className={`flex items-center justify-between px-4 py-3 ${i !== lastTransactions.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${tx.type === 'Ingreso' ? 'bg-income/20' : 'bg-expense/20'}`}>
                      {cat?.icon ?? (tx.type === 'Ingreso' ? '+' : '−')}
                    </div>
                    <div>
                      <p className="font-semibold text-text">{tx.title}</p>
                      <p className="text-xs text-text-muted">
                        {new Date(tx.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold ${tx.type === 'Ingreso' ? 'text-income' : 'text-expense'}`}>
                    {tx.type === 'Ingreso' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showTxModal && (
        <TransactionModal defaultType={txType} onClose={() => setShowTxModal(false)} />
      )}
    </div>
  )
}
