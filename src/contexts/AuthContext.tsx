import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getOrCreateProfile, logout as doLogout } from '../lib/localAuth'
import type { AppUser } from '../types'

interface AuthContextValue {
  appUser: AppUser | null
  setAppUser: (u: AppUser | null) => void
  logout: () => void
  refreshUser: (u: AppUser) => void
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function fallbackProfile(user: { id: string; email?: string | null }): AppUser {
  return {
    uid: user.id,
    email: user.email ?? '',
    displayName: (user.email ?? '').split('@')[0],
    role: 'admin',
    active: true,
    createdAt: new Date().toISOString(),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    // Safety net global: nunca fica preso por mais de 5 segundos
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 5000)

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user) {
          if (!cancelled) setAppUser(null)
          return
        }

        // Tenta carregar perfil do banco, mas cai para fallback em 3s
        // (caso o REST API também tenha problemas de CORS)
        const profilePromise = getOrCreateProfile(session.user)
        const fallbackTimer = new Promise<AppUser>((resolve) =>
          setTimeout(() => resolve(fallbackProfile(session.user)), 3000)
        )

        const profile = await Promise.race([profilePromise, fallbackTimer])
        if (!cancelled) setAppUser(profile)
      } catch {
        if (!cancelled) setAppUser(null)
      } finally {
        if (!cancelled) {
          clearTimeout(safetyTimer)
          setLoading(false)
        }
      }
    }

    init()

    // Escuta apenas logout e renovação de token (não INITIAL_SESSION)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (!cancelled) { setAppUser(null); setLoading(false) }
      }
    })

    return () => {
      cancelled = true
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [])

  function logout() {
    doLogout()
  }

  function refreshUser(u: AppUser) {
    setAppUser(u)
  }

  return (
    <AuthContext.Provider value={{ appUser, setAppUser, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
