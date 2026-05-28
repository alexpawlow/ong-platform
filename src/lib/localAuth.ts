import { supabase } from './supabaseClient'
import type { AppUser, UserRole } from '../types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

// Extrai o projectRef da URL: https://xxtboonawnvlnzmjwqfn.supabase.co → xxtboonawnvlnzmjwqfn
function getProjectRef() {
  return SUPABASE_URL.split('//')[1]?.split('.')[0] ?? ''
}

// Decodifica o payload do JWT sem verificar assinatura (operação local, sem rede)
function decodeJwt(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return {}
  }
}

export async function login(email: string, password: string): Promise<void> {
  // Chama /api/supabase-auth (mesmo domínio = sem CORS).
  // O Vercel repassa para o Supabase server-side.
  const res = await fetch('/api/supabase-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await res.json()

  if (!res.ok) {
    const errMsg: string = data?.error_description ?? data?.message ?? data?.error ?? ''
    if (data?.error === 'invalid_grant' || errMsg.includes('Invalid login credentials')) {
      throw new Error('E-mail ou senha incorretos.')
    }
    if (data?.error === 'email_not_confirmed') {
      throw new Error('E-mail não confirmado. Verifique sua caixa de entrada.')
    }
    throw new Error(errMsg || `Erro ao entrar (${res.status})`)
  }

  // Armazena a sessão no localStorage no formato que o Supabase SDK espera.
  // Evita chamar setSession() que faz chamadas de rede que travam por CORS.
  const payload = decodeJwt(data.access_token)
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: 'bearer',
    expires_in: data.expires_in ?? 3600,
    expires_at: payload.exp as number,
    user: {
      id: payload.sub,
      aud: payload.aud ?? 'authenticated',
      role: payload.role ?? 'authenticated',
      email: payload.email ?? email,
      email_confirmed_at: new Date().toISOString(),
      app_metadata: payload.app_metadata ?? {},
      user_metadata: payload.user_metadata ?? {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  }

  localStorage.setItem(`sb-${getProjectRef()}-auth-token`, JSON.stringify(session))

  // Navega para o dashboard com reload completo.
  // Assim o SDK lê a sessão do localStorage na inicialização (sem chamadas de rede).
  window.location.href = '/dashboard'
}

export async function logout(): Promise<void> {
  localStorage.removeItem(`sb-${getProjectRef()}-auth-token`)
  await supabase.auth.signOut().catch(() => {})
  window.location.href = '/login'
}

export async function changePassword(
  _uid: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < 6) throw new Error('A nova senha deve ter no mínimo 6 caracteres.')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) throw new Error('Sessão inválida.')

  // Verifica senha atual via proxy
  const verifyRes = await fetch('/api/supabase-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
