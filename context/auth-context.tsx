'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

export interface AppUser {
  id: string
  email: string
  displayName: string
  photoURL: string | null
}

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  saveProfilePhoto: (file: File) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<{ photoURL: string | null; displayName: string }> {
  const { data } = await supabase
    .from('profiles')
    .select('photo_url, display_name')
    .eq('id', userId)
    .single()
  return {
    photoURL: data?.photo_url ?? null,
    displayName: data?.display_name ?? '',
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function buildUser(supabaseUser: { id: string; email?: string; user_metadata?: Record<string, string> }): Promise<AppUser> {
    const profile = await fetchProfile(supabaseUser.id)
    return {
      id: supabaseUser.id,
      email: supabaseUser.email ?? '',
      displayName: profile.displayName || supabaseUser.user_metadata?.display_name || '',
      photoURL: profile.photoURL,
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(await buildUser(session.user))
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(await buildUser(session.user))
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function register(name: string, email: string, password: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  async function saveProfilePhoto(file: File) {
    if (!user) return
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

    await supabase.from('profiles').update({ photo_url: publicUrl }).eq('id', user.id)
    await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })

    setUser((prev) => prev ? { ...prev, photoURL: publicUrl } : prev)
  }

  async function refreshUser() {
    const { data: { user: su } } = await supabase.auth.getUser()
    if (su) setUser(await buildUser(su))
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, register, signOut, saveProfilePhoto, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
