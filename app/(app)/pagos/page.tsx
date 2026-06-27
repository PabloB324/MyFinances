'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/context/data-context'
import { formatCurrency, formatDate, getPaymentStatus } from '@/lib/utils'
import { groupPaymentsByStatus } from '@/lib/calculations/payments'
import { PAYMENT_ICONS, RECURRENCE_LABELS, REMINDER_LABELS } from '@/lib/constants'
import type { ScheduledPayment, PaymentRecurrence, PaymentReminder, MarkAsPaidPayload } from '@/types/models'

function statusBadge(payment: ScheduledPayment) {
  const status = getPaymentStatus(payment)
  const map = {
    overdue: { text: 'Vencido', cls: 'bg-expense-light text-expense' },
    dueToday: { text: 'Hoy', cls: 'bg-amber-100 text-amber-700' },
    dueSoon: { text: 'Pronto', cls: 'bg-blue-100 text-blue-700' },
    pending: { text: 'Pendiente', cls: 'bg-surface-alt text-text-muted' },
    paid: { text: 'Pagado', cls: 'bg-income-light text-income' },
  }
  const badge = map[status]
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.text}</span>
}

function PaymentModal({ payment, onClose }: { payment?: ScheduledPayment; onClose: () => void }) {
  const { addPayment, updatePayment } = useData()
  const isEdit = Boolean(payment)

  const [name, setName] = useState(payment?.name ?? '')
  const [icon, setIcon] = useState(payment?.icon ?? '📋')
  const [amount, setAmount] = useState(payment?.amount?.toString() ?? '')
  const [dueDate, setDueDate] = useState(
    payment?.dueDate
      ? new Date(payment.dueDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  )
  const [isRecurring, setIsRecurring] = useState(payment?.isRecurring ?? false)
  const [recurrence, setRecurrence] = useState<PaymentRecurrence>(payment?.recurrence ?? 'monthly')
  const [reminder, setReminder] = useState<PaymentReminder>(payment?.reminder ?? 'threeDaysBefore')
  const [notes, setNotes] = useState(payment?.notes ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !name.trim()) return
    setLoading(true)
    try {
      const payload = {
        name: name.trim(),
        icon,
        amount: parsedAmount,
        dueDate: new Date(dueDate),
        isRecurring,
        recurrence: isRecurring ? recurrence : null,
        reminder,
        notes: notes.trim(),
        isPaid: payment?.isPaid ?? false,
        paidDate: payment?.paidDate ?? null,
        paidAmount: payment?.paidAmount ?? null,
        createdDate: payment?.createdDate ?? new Date(),
      }
      if (isEdit && payment) {
        await updatePayment(payment.id, payload)
      } else {
        await addPayment(payload)
      }
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">{isEdit ? 'Editar pago' : 'Nuevo pago'}</h2>
          <button onClick={onClose} className="text-2xl text-text-muted">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            placeholder="Nombre del pago"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary"
          />

          <div>
            <p className="mb-2 text-sm text-text-muted">Ícono</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_ICONS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setIcon(p.emoji)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl border-2 ${icon === p.emoji ? 'border-primary' : 'border-border'}`}
                >
                  {p.emoji}
                </button>
              ))}
            </div>
          </div>

          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            placeholder="Monto (COP)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary"
          />

          <div>
            <label className="text-sm text-text-muted">Fecha de vencimiento</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <span className="text-sm font-medium text-text">Pago recurrente</span>
            <button
              type="button"
              onClick={() => setIsRecurring((v) => !v)}
              className={`h-6 w-11 rounded-full transition-colors ${isRecurring ? 'bg-primary' : 'bg-border'}`}
            >
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform mx-0.5 ${isRecurring ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {isRecurring && (
            <div>
              <p className="mb-2 text-sm text-text-muted">Frecuencia</p>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(RECURRENCE_LABELS) as [PaymentRecurrence, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRecurrence(key)}
                    className={`rounded-full px-3 py-1.5 text-sm border ${recurrence === key ? 'bg-primary text-white border-primary' : 'border-border text-text-muted'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm text-text-muted">Recordatorio</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(REMINDER_LABELS) as [PaymentReminder, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setReminder(key)}
                  className={`rounded-full px-3 py-1.5 text-xs border ${reminder === key ? 'bg-primary text-white border-primary' : 'border-border text-text-muted'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            placeholder="Notas (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-border bg-surface-alt px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Agregar pago'}
          </button>
        </form>
      </div>
    </div>
  )
}

function MarkAsPaidModal({ payment, onClose }: { payment: ScheduledPayment; onClose: () => void }) {
  const { markAsPaid } = useData()
  const [amount, setAmount] = useState(payment.amount.toString())
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10))
  const [createTx, setCreateTx] = useState(true)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) return
    setLoading(true)
    try {
      await markAsPaid(payment.id, {
        paidAmount: parsed,
        paidDate: new Date(paidDate),
        createTransaction: createTx,
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
          <h2 className="text-lg font-bold text-text">Marcar como pagado</h2>
          <button onClick={onClose} className="text-2xl text-text-muted">×</button>
        </div>
        <p className="mb-4 text-sm text-text-muted">{payment.icon} {payment.name}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text outline-none focus:border-primary"
          />
          <div>
            <label className="text-sm text-text-muted">Fecha de pago</label>
            <input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-text outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <span className="text-sm text-text">Registrar en historial</span>
            <button
              type="button"
              onClick={() => setCreateTx((v) => !v)}
              className={`h-6 w-11 rounded-full transition-colors ${createTx ? 'bg-primary' : 'bg-border'}`}
            >
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform mx-0.5 ${createTx ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-income py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Guardando…' : 'Confirmar pago'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function PagosPage() {
  const { payments, deletePayment, loading } = useData()
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editingPayment, setEditingPayment] = useState<ScheduledPayment | undefined>()
  const [markingPayment, setMarkingPayment] = useState<ScheduledPayment | undefined>()

  const { overdue, upcoming, thisMonth, paid } = useMemo(
    () => groupPaymentsByStatus(payments),
    [payments],
  )

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  function PaymentRow({ p }: { p: ScheduledPayment }) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xl">{p.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-text">{p.name}</p>
          <p className="text-xs text-text-muted">{formatDate(new Date(p.dueDate), { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-semibold text-text">{formatCurrency(p.amount)}</span>
          {statusBadge(p)}
        </div>
        {!p.isPaid && (
          <button
            onClick={() => setMarkingPayment(p)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-border text-text-muted"
          >
            ✓
          </button>
        )}
        <div className="flex gap-1">
          <button onClick={() => { setEditingPayment(p) }} className="text-sm text-text-muted">✏️</button>
          <button onClick={() => { if (confirm(`¿Eliminar "${p.name}"?`)) deletePayment(p.id) }} className="text-sm text-expense">🗑️</button>
        </div>
      </div>
    )
  }

  function Section({ title, items, emptyText }: { title: string; items: ScheduledPayment[]; emptyText?: string }) {
    if (items.length === 0 && !emptyText) return null
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold text-text-muted">{title}</p>
        {items.length === 0 ? (
          <p className="text-sm text-text-muted">{emptyText}</p>
        ) : (
          <div className="rounded-2xl bg-surface shadow-sm overflow-hidden divide-y divide-border">
            {items.map((p) => <PaymentRow key={p.id} p={p} />)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="text-text-muted">‹</button>
          <h1 className="text-xl font-bold text-text">Pagos programados</h1>
        </div>
        <button
          onClick={() => { setEditingPayment(undefined); setShowAdd(true) }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white text-xl shadow"
        >
          +
        </button>
      </div>

      {payments.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-5xl">💳</p>
          <p className="mt-3 text-base font-semibold text-text">Sin pagos programados</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white"
          >
            Agregar pago
          </button>
        </div>
      ) : (
        <>
          <Section title={`Vencidos (${overdue.length})`} items={overdue} />
          <Section title={`Próximos 7 días (${upcoming.length})`} items={upcoming} />
          <Section title={`Este mes (${thisMonth.length})`} items={thisMonth} />
          {paid.length > 0 && <Section title={`Pagados (${paid.length})`} items={paid} />}
        </>
      )}

      {(showAdd || editingPayment !== undefined) && (
        <PaymentModal
          payment={editingPayment}
          onClose={() => { setShowAdd(false); setEditingPayment(undefined) }}
        />
      )}
      {markingPayment && (
        <MarkAsPaidModal payment={markingPayment} onClose={() => setMarkingPayment(undefined)} />
      )}
    </div>
  )
}
