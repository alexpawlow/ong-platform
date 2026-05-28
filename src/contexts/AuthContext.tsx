import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getOrCreateProfile, logout as supabaseLogout } from '../lib/localAuth'
import type { AppUser } from '../types'

interface AuthContextValue {
  appUser: AppUser | null
  setAppUser: (u: AppUser | null) => void
  logout: () => void
  refreshUser: (u: AppUser) => void
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Monta um perfil mínimo a partir dos dados do Auth (fallback sem DB) */
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

    // Safety net: nunca deixa o loading preso por mais de 4 segundos
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 4000)

    // 1. Carrega sessão existente de forma direta e confiável
    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (cancelled) return
        try {
          if (session?.user && !error) {
            const profile = await getOrCreateProfile(session.user)
            if (!cancelled) setAppUser(profile)
          } else {
            if (!cancelled) setAppUser(null)
          }
        } catch {
          // Tabelas não criadas ainda — usa fallback
          if (!cancelled && session?.user) setAppUser(fallbackProfile(session.user))
          else if (!cancelled) setAppUser(null)
        } finally {
          if (!cancelled) {
            clearTimeout(safetyTimer)
            setLoading(false)
          }
        }
      })
      .catch(() => {
        if (!cancelled) { setAppUser(null); setLoading(false); clearTimeout(safetyTimer) }
      })

    // 2. Escuta apenas mudanças posteriores (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // INITIAL_SESSION já foi tratado pelo getSession() acima
      if (event === 'INITIAL_SESSION' || cancelled) return

      try {
        if (!session?.user || event === 'SIGNED_OUT') {
          if (!cancelled) setAppUser(null)
        } else {
          const profile = await getOrCreateProfile(session.user)
          if (!cancelled) setAppUser(profile)
        }
      } catch {
        if (!cancelled && session?.user) setAppUser(fallbackProfile(session.user))
        else if (!cancelled) setAppUser(null)
      }
    })

    return () => {
      cancelled = true
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [])

  function logout() {
    supabaseLogout()
    setAppUser(null)
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
