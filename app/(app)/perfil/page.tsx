'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useData } from '@/context/data-context'

export default function PerfilPage() {
  const { user, signOut, saveProfilePhoto } = useAuth()
  const { transactions, goals, payments } = useData()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await saveProfilePhoto(file)
    } finally {
      setUploading(false)
    }
  }

  async function handleSignOut() {
    if (!confirm('¿Cerrar sesión?')) return
    setSigningOut(true)
    try {
      await signOut()
      router.replace('/login')
    } finally {
      setSigningOut(false)
    }
  }

  const stats = [
    { label: 'Transacciones', value: transactions.length, emoji: '💸' },
    { label: 'Metas', value: goals.length, emoji: '🎯' },
    { label: 'Pagos', value: payments.length, emoji: '💳' },
  ]

  return (
    <div className="space-y-6 px-4 pt-6">
      <h1 className="text-xl font-bold text-text">Perfil</h1>

      {/* Avatar and info */}
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface p-6 shadow-sm">
        <button
          className="relative"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="Avatar"
              className="h-24 w-24 rounded-full object-cover shadow-md"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-4xl text-white shadow-md">
              {(user?.displayName ?? 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-surface border-2 border-border shadow text-sm">
            {uploading ? '⏳' : '📷'}
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />

        <div className="text-center">
          <h2 className="text-xl font-bold text-text">{user?.displayName ?? 'Usuario'}</h2>
          <p className="text-sm text-text-muted">{user?.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-surface p-4 text-center shadow-sm">
            <p className="text-2xl">{stat.emoji}</p>
            <p className="mt-1 text-xl font-bold text-text">{stat.value}</p>
            <p className="text-xs text-text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Categories link */}
      <div className="rounded-2xl bg-surface shadow-sm overflow-hidden divide-y divide-border">
        <button
          onClick={() => router.push('/categorias')}
          className="flex w-full items-center justify-between px-4 py-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🏷️</span>
            <span className="text-sm font-medium text-text">Categorías</span>
          </div>
          <span className="text-text-muted">›</span>
        </button>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="w-full rounded-2xl border-2 border-expense py-4 text-sm font-semibold text-expense disabled:opacity-50"
      >
        {signingOut ? 'Cerrando sesión…' : '🚪 Cerrar sesión'}
      </button>
    </div>
  )
}
