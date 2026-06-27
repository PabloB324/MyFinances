'use client'

import { useState } from 'react'
import { useData } from '@/context/data-context'
import type { Transaction, TransactionType } from '@/types/models'

interface Props {
  defaultType?: TransactionType
  transaction?: Transaction
  onClose: () => void
}

export default function TransactionModal({ defaultType = 'Gasto', transaction, onClose }: Props) {
  const { categories, addTransaction, updateTransaction } = useData()
  const isEdit = Boolean(transaction)

  const [type, setType] = useState<TransactionType>(transaction?.type ?? defaultType)
  const [title, setTitle] = useState(transaction?.title ?? '')
  const [amount, setAmount] = useState(transaction?.amount?.toString() ?? '')
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '')
  const [date, setDate] = useState(
    transaction?.date
      ? new Date(transaction.date).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
  )
  const [notes, setNotes] = useState(transaction?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filteredCategories = categories.filter((c) => c.type === type)

  async function handleSubmit() {
    setError('')
    const parsedAmount = parseFloat(amount)
    if (!title.trim()) { setError('Ingresa un nombre.'); return }
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError('Ingresa un valor válido.'); return }

    setLoading(true)
    try {
      const payload = {
        title: title.trim(),
        amount: parsedAmount,
        date: new Date(date),
        type,
        categoryId: categoryId || null,
        notes: notes.trim(),
      }
      if (isEdit && transaction) {
        await updateTransaction(transaction.id, payload)
      } else {
        await addTransaction(payload)
      }
      onClose()
    } catch {
      setError('Error al guardar. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4">
        <button
          onClick={onClose}
          className="rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary"
        >
          Cancelar
        </button>
        <span className="text-base font-bold text-text">
          {isEdit ? 'Editar transacción' : 'Registrar'}
        </span>
        <div className="w-20" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <h2 className="mb-1 text-2xl font-bold text-text">
          {isEdit ? 'Editar transacción' : 'Nueva transacción'}
        </h2>
        <p className="mb-6 text-sm text-text-muted">
          Captura el movimiento y asígnalo a una categoría.
        </p>

        {error && (
          <div className="mb-4 rounded-2xl bg-expense/10 px-4 py-3 text-sm text-expense">{error}</div>
        )}

        {/* Type toggle */}
        <div className="mb-6 flex rounded-2xl bg-surface-alt p-1">
          {(['Ingreso', 'Gasto'] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setCategoryId('') }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                type === t ? 'bg-surface text-text shadow' : 'text-text-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          {/* Nombre */}
          <div>
            <p className="mb-2 text-sm font-semibold text-text">Nombre</p>
            <input
              type="text"
              placeholder="Ej. Supermercado o nómina"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl bg-surface px-4 py-4 text-text placeholder-text-muted outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Valor */}
          <div>
            <p className="mb-2 text-sm font-semibold text-text">Valor</p>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Ej. 250.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-2xl bg-surface px-4 py-4 text-text placeholder-text-muted outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Categoría */}
          <div>
            <p className="mb-2 text-sm font-semibold text-text">Categoría</p>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-2xl bg-surface px-4 py-4 text-text outline-none focus:ring-2 focus:ring-primary appearance-none"
            >
              <option value="">Sin categoría</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <p className="mb-2 text-sm font-semibold text-text">Fecha</p>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl bg-surface px-4 py-4 text-text outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Nota */}
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
              <span className="text-primary">📋</span> Nota (opcional)
            </p>
            <textarea
              placeholder="Ej. Cumpleaños de mamá, emergencia, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-2xl bg-surface px-4 py-4 text-text placeholder-text-muted outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="px-4 pb-8 pt-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-base font-bold text-white shadow-xl shadow-primary/30 disabled:opacity-50 active:scale-95 transition-all"
        >
          <span className="text-xl">+</span>
          {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar movimiento'}
        </button>
      </div>
    </div>
  )
}
