'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/context/data-context'
import { CATEGORY_ICONS } from '@/lib/constants'
import type { TransactionType, ColorName } from '@/types/models'

function AddCategoryModal({ onClose }: { onClose: () => void }) {
  const { addCategory } = useData()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📋')
  const [type, setType] = useState<TransactionType>('Gasto')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await addCategory({
        name: name.trim(),
        icon,
        colorName: (type === 'Ingreso' ? 'income' : 'expense') as ColorName,
        type,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Nueva categoría</h2>
          <button onClick={onClose} className="text-2xl text-text-muted">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-xl border border-border p-1">
            {(['Gasto', 'Ingreso'] as TransactionType[]).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${type === t ? (t === 'Ingreso' ? 'bg-income text-white' : 'bg-expense text-white') : 'text-text-muted'}`}>
                {t}
              </button>
            ))}
          </div>

          <input
            type="text"
            required
            placeholder="Nombre de la categoría"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary"
          />

          <div>
            <p className="mb-2 text-sm text-text-muted">Ícono</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ICONS.map((c) => (
                <button key={c.key} type="button" onClick={() => setIcon(c.emoji)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl border-2 ${icon === c.emoji ? 'border-primary' : 'border-border'}`}>
                  {c.emoji}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-50">
            {loading ? 'Guardando…' : 'Crear categoría'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function CategoriasPage() {
  const { categories, deleteCategory } = useData()
  const router = useRouter()
  const [typeFilter, setTypeFilter] = useState<TransactionType>('Gasto')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = categories.filter((c) => c.type === typeFilter)

  return (
    <div className="space-y-4 px-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="text-text-muted">‹</button>
          <h1 className="text-xl font-bold text-text">Categorías</h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white text-xl shadow"
        >
          +
        </button>
      </div>

      {/* Type filter */}
      <div className="flex rounded-xl border border-border p-1 bg-surface">
        {(['Gasto', 'Ingreso'] as TransactionType[]).map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${typeFilter === t ? (t === 'Ingreso' ? 'bg-income text-white' : 'bg-expense text-white') : 'text-text-muted'}`}>
            {t}s
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-3xl">🏷️</p>
          <p className="mt-2 text-sm text-text-muted">Sin categorías de {typeFilter.toLowerCase()}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface shadow-sm overflow-hidden divide-y divide-border">
          {filtered.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${cat.type === 'Ingreso' ? 'bg-income-light' : 'bg-expense-light'}`}>
                {cat.icon}
              </div>
              <span className="flex-1 text-sm font-medium text-text">{cat.name}</span>
              <span className={`text-xs font-medium ${cat.type === 'Ingreso' ? 'text-income' : 'text-expense'}`}>
                {cat.type}
              </span>
              <button
                onClick={() => { if (confirm(`¿Eliminar "${cat.name}"?`)) deleteCategory(cat.id) }}
                className="text-sm text-expense"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddCategoryModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
