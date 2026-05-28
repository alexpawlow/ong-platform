import { supabase } from './supabaseClient'
import type { AppUser, UserRole } from '../types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function login(email: string, password: string): Promise<void> {
  // Faz fetch direto ao endpoint (igual ao curl que funciona),
  // sem depender do comportamento interno do SDK.
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
    },
    body: JSON.stringify({ email, password }),
  })

  const data = await res.json()

  if (!res.ok) {
    const msg: string = data?.error_description ?? data?.message ?? data?.error ?? ''
    if (msg.includes('Invalid login credentials') || data?.error === 'invalid_grant') {
      throw new Error('E-mail ou senha incorretos.')
    }
    if (data?.error === 'email_not_confirmed') {
      throw new Error('E-mail não confirmado. Confirme em Supabase → Auth → Users.')
    }
    throw new Error(`Erro ao entrar: ${msg || res.status}`)
  }

  // Injeta a sessão no cliente Supabase para que o onAuthStateChange dispare
  await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  })
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
}

export async function changePassword(
  _uid: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < 6) throw new Error('A nova senha deve ter no mínimo 6 caracteres.')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) throw new Error('Sessão inválida.')

  // Verifica senha atual
  const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
    body: JSON.stringify({ email: user.email, password: currentPassword }),
  })
  if (!verifyRes.ok) throw new Error('Senha atual incorreta.')

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error('Erro ao alterar senha.')
}

export async function getOrCreateProfile(user: { id: string; email?: string | null }): Promise<AppUser> {
  const { data: profile, error: selectError } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  if (selectError?.code === '42P01') throw new Error('profiles table not found')

  if (profile) {
    void supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', user.id)
    return dbToAppUser(profile)
  }

  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  const role: UserRole = count === 0 ? 'admin' : 'viewer'
  const newProfile = {
    id: user.id,
    email: user.email ?? '',
    display_name: (user.email ?? '').split('@')[0],
    role,
    active: true,
  }

  const { error: insertError } = await supabase.from('profiles').insert(newProfile)
  if (insertError?.code === '42P01') throw new Error('profiles table not found')

  return {
    uid: user.id, email: newProfile.email, displayName: newProfile.display_name,
    role, active: true, createdAt: new Date().toISOString(), lastLogin: new Date().toISOString(),
  }
}

export function dbToAppUser(p: Record<string, unknown>): AppUser {
  return {
    uid: p.id as string, email: p.email as string, displayName: p.display_name as string,
    role: p.role as UserRole, active: p.active as boolean,
    createdAt: p.created_at as string, lastLogin: p.last_login as string | undefined,
  }
}
