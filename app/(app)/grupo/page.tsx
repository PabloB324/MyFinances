'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { useData } from '@/context/data-context'
import { useGroup } from '@/context/group-context'
import { formatCurrency, formatDate, totalByType, filterTransactionsByMonth } from '@/lib/utils'
import type { GroupTransaction, TransactionType } from '@/types/models'
import TransactionModal from '@/components/transactions/transaction-modal'

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const { createGroup } = useGroup()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await createGroup(name.trim())
      onClose()
    } catch {
      setError('Error al crear el grupo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Crear grupo</h2>
          <button onClick={onClose} className="text-2xl text-text-muted">×</button>
        </div>
        {error && <div className="mb-3 rounded-xl bg-expense-light px-4 py-3 text-sm text-expense">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            placeholder="Nombre del grupo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary"
          />
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-50">
            {loading ? 'Creando…' : 'Crear grupo'}
          </button>
        </form>
      </div>
    </div>
  )
}

function JoinGroupModal({ onClose }: { onClose: () => void }) {
  const { joinGroup } = useGroup()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return
    setLoading(true)
    try {
      await joinGroup(code)
      onClose()
    } catch {
      setError('Código no encontrado. Verifica e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Unirse a grupo</h2>
          <button onClick={onClose} className="text-2xl text-text-muted">×</button>
        </div>
        {error && <div className="mb-3 rounded-xl bg-expense-light px-4 py-3 text-sm text-expense">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            maxLength={6}
            placeholder="Código del grupo (6 caracteres)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-center text-lg font-mono uppercase tracking-widest text-text placeholder-text-muted outline-none focus:border-primary"
          />
          <button type="submit" disabled={loading || code.length !== 6} className="w-full rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-50">
            {loading ? 'Buscando…' : 'Unirme'}
          </button>
        </form>
      </div>
    </div>
  )
}

function GroupTxModal({
  tx,
  onClose,
}: {
  tx?: GroupTransaction
  onClose: () => void
}) {
  const { user } = useAuth()
  const { categories } = useData()
  const { addGroupTransaction, updateGroupTransaction } = useGroup()
  const isEdit = Boolean(tx)

  const [type, setType] = useState<TransactionType>(tx?.type ?? 'Gasto')
  const [title, setTitle] = useState(tx?.title ?? '')
  const [amount, setAmount] = useState(tx?.amount?.toString() ?? '')
  const [categoryId, setCategoryId] = useState(tx?.categoryId ?? '')
  const [date, setDate] = useState(
    tx?.date ? new Date(tx.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
  )
  const [loading, setLoading] = useState(false)

  const filteredCategories = categories.filter((c) => c.type === type)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !title.trim()) return
    setLoading(true)
    try {
      const payload = {
        title: title.trim(),
        amount: parsedAmount,
        date: new Date(date),
        type,
        categoryId: categoryId || null,
        createdByUid: user!.id,
        createdByName: user!.displayName ?? 'Usuario',
      }
      if (isEdit && tx) {
        await updateGroupTransaction(tx.id, payload)
      } else {
        await addGroupTransaction(payload)
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
          <h2 className="text-lg font-bold text-text">{isEdit ? 'Editar transacción' : 'Nueva transacción del grupo'}</h2>
          <button onClick={onClose} className="text-2xl text-text-muted">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-xl border border-border p-1">
            {(['Ingreso', 'Gasto'] as TransactionType[]).map((t) => (
              <button key={t} type="button" onClick={() => { setType(t); setCategoryId('') }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${type === t ? (t === 'Ingreso' ? 'bg-income text-white' : 'bg-expense text-white') : 'text-text-muted'}`}>
                {t}
              </button>
            ))}
          </div>
          <input type="text" required placeholder="Descripción" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary" />
          <input type="number" required min="0.01" step="0.01" placeholder="Monto (COP)" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary" />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text outline-none focus:border-primary">
            <option value="">Sin categoría</option>
            {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text outline-none focus:border-primary" />
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-50">
            {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Agregar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function GrupoPage() {
  const { user } = useAuth()
  const { categories } = useData()
  const { group, groupTransactions, groupLoading, leaveGroup, deleteGroupTransaction } = useGroup()

  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [editingTx, setEditingTx] = useState<GroupTransaction | undefined>()
  const [codeCopied, setCodeCopied] = useState(false)

  const now = new Date()
  const monthTx = useMemo(
    () => groupTransactions.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }),
    [groupTransactions],
  )

  const groupIncome = useMemo(() => monthTx.filter((t) => t.type === 'Ingreso').reduce((s, t) => s + t.amount, 0), [monthTx])
  const groupExpense = useMemo(() => monthTx.filter((t) => t.type === 'Gasto').reduce((s, t) => s + t.amount, 0), [monthTx])

  const memberContributions = useMemo(() => {
    if (!group) return []
    return group.members.map((uid) => {
      const memberTx = monthTx.filter((t) => t.createdByUid === uid)
      const income = memberTx.filter((t) => t.type === 'Ingreso').reduce((s, t) => s + t.amount, 0)
      const expense = memberTx.filter((t) => t.type === 'Gasto').reduce((s, t) => s + t.amount, 0)
      return {
        uid,
        name: group.memberNames[uid] ?? 'Miembro',
        photoURL: group.memberPhotoURLs[uid],
        income,
        expense,
      }
    })
  }, [group, monthTx])

  async function copyCode() {
    if (!group) return
    await navigator.clipboard.writeText(group.code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  if (groupLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 space-y-4">
        <p className="text-5xl">👥</p>
        <h1 className="text-xl font-bold text-text">Finanzas en grupo</h1>
        <p className="text-center text-sm text-text-muted">
          Crea un grupo para compartir y rastrear finanzas con otras personas
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="w-full max-w-xs rounded-xl bg-primary py-3 font-semibold text-white shadow"
        >
          Crear un grupo
        </button>
        <button
          onClick={() => setShowJoin(true)}
          className="w-full max-w-xs rounded-xl border-2 border-primary py-3 font-semibold text-primary"
        >
          Unirme con código
        </button>
        {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
        {showJoin && <JoinGroupModal onClose={() => setShowJoin(false)} />}
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">{group.name}</h1>
          <p className="text-xs text-text-muted">{group.members.length} miembro{group.members.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { if (confirm('¿Salir del grupo?')) leaveGroup() }}
            className="rounded-xl border border-border px-3 py-2 text-xs text-expense"
          >
            Salir
          </button>
          <button
            onClick={() => setShowAddTx(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white text-xl shadow"
          >
            +
          </button>
        </div>
      </div>

      {/* Invite code */}
      <button
        onClick={copyCode}
        className="flex w-full items-center justify-between rounded-2xl bg-primary-light px-4 py-3"
      >
        <div>
          <p className="text-xs text-primary">Código de invitación</p>
          <p className="font-mono text-xl font-bold tracking-widest text-primary">{group.code}</p>
        </div>
        <span className="text-sm font-medium text-primary">{codeCopied ? '✅ Copiado' : '📋 Copiar'}</span>
      </button>

      {/* Members */}
      <div className="rounded-2xl bg-surface p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium text-text-muted">Miembros</p>
        <div className="flex gap-3 flex-wrap">
          {group.members.map((uid) => {
            const photoURL = group.memberPhotoURLs[uid]
            const name = group.memberNames[uid] ?? 'Miembro'
            return (
              <div key={uid} className="flex flex-col items-center gap-1">
                {photoURL ? (
                  <img src={photoURL} alt={name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold">
                    {name[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-text-muted max-w-[60px] truncate">{name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Monthly balance */}
      <div className="rounded-2xl bg-surface p-4 shadow-sm">
        <p className="text-sm font-medium text-text-muted">Balance del grupo este mes</p>
        <p className={`mt-1 text-2xl font-bold ${groupIncome - groupExpense >= 0 ? 'text-income' : 'text-expense'}`}>
          {formatCurrency(groupIncome - groupExpense)}
        </p>
        <div className="mt-2 flex gap-4 text-sm">
          <span className="text-income">+{formatCurrency(groupIncome)}</span>
          <span className="text-expense">−{formatCurrency(groupExpense)}</span>
        </div>
      </div>

      {/* Member breakdown */}
      {memberContributions.length > 0 && (
        <div className="rounded-2xl bg-surface shadow-sm overflow-hidden divide-y divide-border">
          <p className="px-4 py-3 text-sm font-medium text-text-muted">Por miembro</p>
          {memberContributions.map((m) => (
            <div key={m.uid} className="flex items-center gap-3 px-4 py-3">
              {m.photoURL ? (
                <img src={m.photoURL} alt={m.name} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                  {m.name[0].toUpperCase()}
                </div>
              )}
              <span className="flex-1 text-sm font-medium text-text">{m.name}</span>
              <div className="text-right">
                <p className="text-xs text-income">+{formatCurrency(m.income)}</p>
                <p className="text-xs text-expense">−{formatCurrency(m.expense)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Group transactions */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-text-muted">
          Transacciones del grupo ({groupTransactions.length})
        </p>
        {groupTransactions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-3xl">📭</p>
            <p className="mt-2 text-sm text-text-muted">Sin transacciones en el grupo</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface shadow-sm overflow-hidden divide-y divide-border">
            {[...groupTransactions]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((tx) => {
                const cat = categories.find((c) => c.id === tx.categoryId)
                const isOwner = tx.createdByUid === user?.id
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${tx.type === 'Ingreso' ? 'bg-income-light' : 'bg-expense-light'}`}>
                      {cat?.icon ?? (tx.type === 'Ingreso' ? '💰' : '💸')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-text">{tx.title}</p>
                      <p className="text-xs text-text-muted">{tx.createdByName}</p>
                    </div>
                    <p className={`text-sm font-semibold ${tx.type === 'Ingreso' ? 'text-income' : 'text-expense'}`}>
                      {tx.type === 'Ingreso' ? '+' : '−'}{formatCurrency(tx.amount)}
                    </p>
                    {isOwner && (
                      <div className="flex gap-1">
                        <button onClick={() => setEditingTx(tx)} className="text-sm text-text-muted">✏️</button>
                        <button onClick={() => { if (confirm('¿Eliminar?')) deleteGroupTransaction(tx.id) }} className="text-sm text-expense">🗑️</button>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {showAddTx && <GroupTxModal onClose={() => setShowAddTx(false)} />}
      {editingTx && <GroupTxModal tx={editingTx} onClose={() => setEditingTx(undefined)} />}
    </div>
  )
}
