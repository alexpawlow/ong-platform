import { createContext, useContext, useState, type ReactNode } from 'react'
import { getCurrentSession, logout as localLogout } from '../lib/localAuth'
import type { AppUser } from '../types'

interface AuthContextValue {
  appUser: AppUser | null
  setAppUser: (u: AppUser | null) => void
  logout: () => void
  refreshUser: (u: AppUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [appUser, setAppUser] = useState<AppUser | null>(() => getCurrentSession())

  function logout() {
    localLogout()
    setAppUser(null)
  }

  function refreshUser(u: AppUser) {
    setAppUser(u)
    sessionStorage.setItem('ong:session', JSON.stringify(u))
  }

  return (
    <AuthContext.Provider value={{ appUser, setAppUser, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
