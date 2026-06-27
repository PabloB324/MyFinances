'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSent(true)
    } catch {
      setError('No se pudo enviar el correo. Verifica la dirección.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12 bg-surface-alt">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl shadow-lg">
            🔑
          </div>
          <h1 className="text-2xl font-bold text-text">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-text-muted">
            Te enviamos un link para restablecerla
          </p>
        </div>

        {sent ? (
          <div className="rounded-2xl bg-income/10 px-5 py-6 text-center">
            <p className="text-lg font-bold text-income">¡Correo enviado!</p>
            <p className="mt-2 text-sm text-text-muted">
              Revisa tu bandeja de entrada y sigue el link para crear una nueva contraseña.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-semibold text-primary"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-expense/10 px-4 py-3 text-sm text-expense">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-muted" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 font-semibold text-white shadow-sm transition active:opacity-80 disabled:opacity-50"
            >
              {loading ? 'Enviando…' : 'Enviar link de recuperación'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-text-muted">
          <Link href="/login" className="font-semibold text-primary">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
