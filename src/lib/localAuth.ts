import { getUserByEmail, updateUser } from './storage'
import type { AppUser } from '../types'

const SESSION_KEY = 'ong:session'

export function getCurrentSession(): AppUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as AppUser) : null
  } catch {
    return null
  }
}

export function login(email: string, password: string): AppUser {
  const user = getUserByEmail(email)
  if (!user) throw new Error('Usuário não encontrado.')
  if (user.password !== password) throw new Error('Senha incorreta.')
  if (!user.active) throw new Error('Conta desativada. Entre em contato com o administrador.')

  updateUser(user.uid, { lastLogin: new Date().toISOString() })
  const { password: _pw, ...session } = user
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

export function changePassword(uid: string, currentPassword: string, newPassword: string): void {
  const user = getUserByEmail(
    (JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}') as AppUser).email
  )
  if (!user) throw new Error('Sessão inválida.')
  if (user.password !== currentPassword) throw new Error('Senha atual incorreta.')
  if (newPassword.length < 6) throw new Error('A nova senha deve ter no mínimo 6 caracteres.')
  updateUser(uid, { password: newPassword })
}
