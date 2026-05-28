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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Usa apenas onAuthStateChange — ele dispara imediatamente com a sessão atual
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setAppUser(null)
        } else {
          const profile = await getOrCreateProfile(session.user)
          setAppUser(profile)
        }
      } catch (err) {
        console.error('Erro ao carregar perfil:', err)
        // Fallback: monta perfil mínimo a partir dos dados do Auth
        if (session?.user) {
          setAppUser({
            uid: session.user.id,
            email: session.user.email || '',
            displayName: (session.user.email || '').split('@')[0],
            role: 'admin',
            active: true,
            createdAt: new Date().toISOString(),
          })
        } else {
          setAppUser(null)
        }
      } finally {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
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
