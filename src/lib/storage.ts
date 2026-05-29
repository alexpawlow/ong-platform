import { supabase } from './supabaseClient'
import { dbToAppUser } from './localAuth'
import type { AppUser, Automation, MoodleConfig, MailchimpConfig, UserRole } from '../types'

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ── Users ─────────────────────────────────────────────────────

export async function getUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at')
  if (error) throw error
  return (data || []).map(dbToAppUser)
}

export async function getUserById(uid: string): Promise<AppUser | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
  return data ? dbToAppUser(data) : null
}

export async function updateUser(uid: string, data: Partial<AppUser & { password: string }>): Promise<void> {
  const update: Record<string, unknown> = {}
  if (data.displayName !== undefined) update.display_name = data.displayName
  if (data.role !== undefined) update.role = data.role
  if (data.active !== undefined) update.active = data.active
  if (data.lastLogin !== undefined) update.last_login = data.lastLogin
  const { error } = await supabase.from('profiles').update(update).eq('id', uid)
  if (error) throw error
}

export async function deleteUser(uid: string): Promise<void> {
  const { error } = await supabase.from('profiles').delete().eq('id', uid)
  if (error) throw error
  // Nota: o usuário de autenticação deve ser removido no painel do Supabase (Auth → Users)
}

export async function adminCreateUser(
  email: string,
  password: string,
  displayName: string,
  role: UserRole
): Promise<string> {
  // Salva sessão atual
  const { data: { session: currentSession } } = await supabase.auth.getSession()

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Falha ao criar usuário.')

  await supabase.from('profiles').insert({
    id: data.user.id, email, display_name: displayName, role, active: true,
  })

  // Restaura sessão do admin se o signUp a alterou
  if (currentSession && data.session) {
    await supabase.auth.setSession({
      access_token: currentSession.access_token,
      refresh_token: currentSession.refresh_token,
    })
  }
  return data.user.id
}

// ── Automations ───────────────────────────────────────────────

export async function getAutomations(): Promise<Automation[]> {
  const { data, error } = await supabase
    .from('automations').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(a => ({
    id: a.id, name: a.name, type: a.type,
    courseId: a.course_id, courseName: a.course_name,
    mailchimpTag: a.mailchimp_tag, mailchimpListId: a.mailchimp_list_id,
    inactivityDays: a.inactivity_days, active: a.active,
    lastRun: a.last_run, runCount: a.run_count,
    createdBy: a.created_by, createdAt: a.created_at,
  }))
}

export async function saveAutomation(data: Omit<Automation, 'id'>): Promise<string> {
  const { data: row, error } = await supabase.from('automations').insert({
    name: data.name, type: data.type,
    course_id: data.courseId, course_name: data.courseName,
    mailchimp_tag: data.mailchimpTag, mailchimp_list_id: data.mailchimpListId,
    inactivity_days: data.inactivityDays, active: data.active,
    run_count: data.runCount || 0, created_by: data.createdBy,
  }).select('id').single()
  if (error) throw error
  return row.id
}

export async function updateAutomation(id: string, data: Partial<Automation>): Promise<void> {
  const u: Record<string, unknown> = {}
  if (data.name !== undefined) u.name = data.name
  if (data.type !== undefined) u.type = data.type
  if (data.courseId !== undefined) u.course_id = data.courseId
  if (data.courseName !== undefined) u.course_name = data.courseName
  if (data.mailchimpTag !== undefined) u.mailchimp_tag = data.mailchimpTag
  if (data.mailchimpListId !== undefined) u.mailchimp_list_id = data.mailchimpListId
  if (data.inactivityDays !== undefined) u.inactivity_days = data.inactivityDays
  if (data.active !== undefined) u.active = data.active
  if (data.lastRun !== undefined) u.last_run = data.lastRun
  if (data.runCount !== undefined) u.run_count = data.runCount
  const { error } = await supabase.from('automations').update(u).eq('id', id)
  if (error) throw error
}

export async function deleteAutomation(id: string): Promise<void> {
  const { error } = await supabase.from('automations').delete().eq('id', id)
  if (error) throw error
}

// ── Settings ──────────────────────────────────────────────────

export async function getMoodleConfig(): Promise<MoodleConfig | null> {
  const { data } = await supabase.from('settings').select('value').eq('key', 'moodle').single()
  return data ? (data.value as MoodleConfig) : null
}

export async function saveMoodleConfig(cfg: MoodleConfig): Promise<void> {
  const { error } = await supabase.from('settings')
    .upsert({ key: 'moodle', value: cfg, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function getMoodleCourses(): Promise<import('../types').MoodleCourse[] | null> {
  const { data } = await supabase.from('settings').select('value').eq('key', 'moodle_courses').single()
  return data ? (data.value as import('../types').MoodleCourse[]) : null
}

export async function saveMoodleCourses(courses: import('../types').MoodleCourse[]): Promise<void> {
  const { error } = await supabase.from('settings')
    .upsert({ key: 'moodle_courses', value: courses, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function getMailchimpConfig(): Promise<MailchimpConfig | null> {
  const { data } = await supabase.from('settings').select('value').eq('key', 'mailchimp').single()
  return data ? (data.value as MailchimpConfig) : null
}

export async function saveMailchimpConfig(cfg: MailchimpConfig): Promise<void> {
  const { error } = await supabase.from('settings')
    .upsert({ key: 'mailchimp', value: cfg, updated_at: new Date().toISOString() })
  if (error) throw error
}
