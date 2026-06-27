'use client'

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'

const AuthProvider = dynamic(
  () => import('@/context/auth-context').then((m) => ({ default: m.AuthProvider })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    ),
  },
)

export function ClientRoot({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
