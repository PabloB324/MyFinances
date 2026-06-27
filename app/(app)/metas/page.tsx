'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/context/data-context'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  goalProgress,
  goalDaysRemaining,
  goalRequiredQuota,
  goalNextContributionDate,
  goalFeasibility,
  goalRemaining,
} from '@/lib/calculations/goals'
import { GOAL_ICONS, FREQUENCY_LABELS } from '@/lib/constants'
import type { SavingsGoal, SavingsFrequency } from '@/types/models'

function GoalCard({
  goal,
  onContribute,
  onEdit,
  onDelete,
}: {
  goal: SavingsGoal
  onContribute: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const pct = goalProgress(goal)
  const days = goalDaysRemaining(goal)
  const quota = goalRequiredQuota(goal)
  const completed = pct >= 1

  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{goal.icon}</span>
          <div>
            <p className="font-semibold text-text">{goal.name}</p>
            <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
              {FREQUENCY_LABELS[goal.frequency]}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="text-text-muted text-sm">✏️</button>
          <button onClick={onDelete} className="text-expense text-sm">🗑️</button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-income">{formatCurrency(goal.savedAmount)}</span>
          <span className="text-text-muted">{formatCurrency(goal.targetAmount)}</span>
        </div>
        <div className="h-2.5 rounded-full bg-border">
          <div
            className={`h-full rounded-full transition-all ${completed ? 'bg-income' : 'bg-primary'}`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-text-muted">{(pct * 100).toFixed(0)}%</p>
      </div>

      {!completed && (
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-surface-alt p-2">
            <p className="text-xs text-text-muted">Cuota requerida</p>
            <p className="font-semibold text-text">{formatCurrency(quota)}</p>
          </div>
          <div className="rounded-xl bg-surface-alt p-2">
            <p className="text-xs text-text-muted">Días restantes</p>
            <p className="font-semibold text-text">{days}</p>
          </div>
        </div>
      )}

      {!completed && (
        <button
          onClick={onContribute}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white"
        >
          Registrar aporte
        </button>
      )}

      {completed && (
        <div className="rounded-xl bg-income-light px-4 py-3 text-center text-sm font-semibold text-income">
          ✅ Meta completada
        </div>
      )}
    </div>
  )
}

function GoalModal({
  goal,
  onClose,
}: {
  goal?: SavingsGoal
  onClose: () => void
}) {
  const { addGoal, updateGoal } = useData()
  const isEdit = Boolean(goal)

  const [name, setName] = useState(goal?.name ?? '')
  const [icon, setIcon] = useState(goal?.icon ?? '⭐')
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount?.toString() ?? '')
  const [deadline, setDeadline] = useState(
    goal?.deadline
      ? new Date(goal.deadline).toISOString().slice(0, 10)
      : (() => {
          const d = new Date()
          d.setMonth(d.getMonth() + 6)
          return d.toISOString().slice(0, 10)
        })(),
  )
  const [frequency, setFrequency] = useState<SavingsFrequency>(goal?.frequency ?? 'monthly')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(targetAmount)
    if (isNaN(amount) || amount <= 0 || !name.trim()) return
    setLoading(true)
    try {
      const payload = {
        name: name.trim(),
        icon,
        targetAmount: amount,
        deadline: new Date(deadline),
        frequency,
        createdDate: goal?.createdDate ?? new Date(),
        savedAmount: goal?.savedAmount ?? 0,
        lastContributionDate: goal?.lastContributionDate ?? null,
      }
      if (isEdit && goal) {
        await updateGoal(goal.id, payload)
      } else {
        await addGoal(payload)
      }
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">{isEdit ? 'Editar meta' : 'Nueva meta'}</h2>
          <button onClick={onClose} className="text-2xl text-text-muted">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            placeholder="Nombre de la meta"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary"
          />

          {/* Icon picker */}
          <div>
            <p className="mb-2 text-sm text-text-muted">Ícono</p>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setIcon(g.emoji)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl border-2 ${icon === g.emoji ? 'border-primary' : 'border-border'}`}
                >
                  {g.emoji}
                </button>
              ))}
            </div>
          </div>

          <input
            type="number"
            required
            min="1"
            step="0.01"
            placeholder="Monto objetivo (COP)"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary"
          />

          <div>
            <label className="text-sm text-text-muted">Fecha límite</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text outline-none focus:border-primary"
            />
          </div>

          <div>
            <p className="mb-2 text-sm text-text-muted">Frecuencia de ahorro</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(FREQUENCY_LABELS) as [SavingsFrequency, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFrequency(key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium border ${frequency === key ? 'bg-primary text-white border-primary' : 'border-border text-text-muted'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear meta'}
          </button>
        </form>
      </div>
    </div>
  )
}

function ContributeModal({ goal, onClose }: { goal: SavingsGoal; onClose: () => void }) {
  const { addContribution } = useData()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const quota = goalRequiredQuota(goal)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) return
    setLoading(true)
    try {
      await addContribution(goal.id, parsed)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Registrar aporte</h2>
          <button onClick={onClose} className="text-2xl text-text-muted">×</button>
        </div>
        <p className="mb-4 text-sm text-text-muted">
          {goal.icon} {goal.name} · Cuota sugerida: {formatCurrency(quota)}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            placeholder={`Monto (sugerido: ${formatCurrency(quota)})`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Guardando…' : 'Registrar aporte'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function MetasPage() {
  const { goals, deleteGoal, loading } = useData()
  const router = useRouter()
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | undefined>()
  const [contributingGoal, setContributingGoal] = useState<SavingsGoal | undefined>()

  const active = useMemo(() => goals.filter((g) => g.savedAmount < g.targetAmount), [goals])
  const completed = useMemo(() => goals.filter((g) => g.savedAmount >= g.targetAmount), [goals])

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
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="text-text-muted">‹</button>
          <h1 className="text-xl font-bold text-text">Metas de ahorro</h1>
        </div>
        <button
          onClick={() => { setEditingGoal(undefined); setShowGoalModal(true) }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white text-xl shadow"
        >
          +
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-5xl">🎯</p>
          <p className="mt-3 text-base font-semibold text-text">Sin metas de ahorro</p>
          <p className="mt-1 text-sm text-text-muted">Crea tu primera meta para empezar a ahorrar</p>
          <button
            onClick={() => { setEditingGoal(undefined); setShowGoalModal(true) }}
            className="mt-4 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white"
          >
            Crear meta
          </button>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-text-muted">En progreso ({active.length})</p>
              {active.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onContribute={() => setContributingGoal(goal)}
                  onEdit={() => { setEditingGoal(goal); setShowGoalModal(true) }}
                  onDelete={() => { if (confirm(`¿Eliminar "${goal.name}"?`)) deleteGoal(goal.id) }}
                />
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-text-muted">Completadas ({completed.length})</p>
              {completed.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onContribute={() => {}}
                  onEdit={() => { setEditingGoal(goal); setShowGoalModal(true) }}
                  onDelete={() => { if (confirm(`¿Eliminar "${goal.name}"?`)) deleteGoal(goal.id) }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showGoalModal && (
        <GoalModal
          goal={editingGoal}
          onClose={() => { setShowGoalModal(false); setEditingGoal(undefined) }}
        />
      )}
      {contributingGoal && (
        <ContributeModal
          goal={contributingGoal}
          onClose={() => setContributingGoal(undefined)}
        />
      )}
    </div>
  )
}
