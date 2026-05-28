import { supabase } from './supabaseClient'
import type { AppUser, UserRole } from '../types'

export async function login(email: string, password: string): Promise<void> {
  // Timeout de 10s para evitar spinner infinito
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Tempo limite excedido. Verifique sua conexão e tente novamente.')), 10000)
  )

  const authCall = supabase.auth.signInWithPassword({ email, password }).then(({ error }) => {
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('E-mail ou senha incorretos.')
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('E-mail não confirmado. Vá em Supabase → Authentication → Users e clique em "Send confirmation email" ou desative a confirmação em Auth → Settings.')
      }
      // Mostra o erro real do Supabase para facilitar diagnóstico
      throw new Error(`Erro ao entrar: ${error.message}`)
    }
  })

  return Promise.race([authCall, timeout])
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
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
  if (verifyError) throw new Error('Senha atual incorreta.')
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
