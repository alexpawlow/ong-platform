// Generic localStorage CRUD — substitui Firestore em modo local.
// Cada coleção é uma chave no localStorage com um array JSON.

const PREFIX = 'ong:'

function read<T>(collection: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + collection) || '[]') as T[]
  } catch {
    return []
  }
}

function write<T>(collection: string, items: T[]): void {
  localStorage.setItem(PREFIX + collection, JSON.stringify(items))
}

function readOne<T>(collection: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + collection)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeOne<T>(collection: string, item: T): void {
  localStorage.setItem(PREFIX + collection, JSON.stringify(item))
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ── Users ──────────────────────────────────────────────────────
import type { AppUser } from '../types'

const USERS_KEY = 'users'

const DEFAULT_USERS: (AppUser & { password: string })[] = [
  {
    uid: 'user-admin',
    email: 'admin@ong.local',
    password: 'Admin@123',
    displayName: 'Administrador',
    role: 'admin',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    uid: 'user-manager',
    email: 'gestor@ong.local',
    password: 'gestor123',
    displayName: 'Gestora Silva',
    role: 'manager',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    uid: 'user-viewer',
    email: 'viewer@ong.local',
    password: 'viewer123',
    displayName: 'Visualizador',
    role: 'viewer',
    active: true,
    createdAt: new Date().toISOString(),
  },
]

function seedUsers() {
  if (!localStorage.getItem(PREFIX + USERS_KEY)) {
    write(USERS_KEY, DEFAULT_USERS)
  }
}

export function getUsers(): AppUser[] {
  seedUsers()
  return read<AppUser & { password: string }>(USERS_KEY).map(({ password: _pw, ...u }) => u)
}

export function getUserByEmail(email: string): (AppUser & { password: string }) | null {
  seedUsers()
  return read<AppUser & { password: string }>(USERS_KEY).find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  ) ?? null
}

export function getUserById(uid: string): AppUser | null {
  seedUsers()
  const u = read<AppUser & { password: string }>(USERS_KEY).find((x) => x.uid === uid)
  if (!u) return null
  const { password: _pw, ...rest } = u
  return rest
}

export function updateUser(uid: string, data: Partial<AppUser & { password: string }>): void {
  const all = read<AppUser & { password: string }>(USERS_KEY)
  write(USERS_KEY, all.map((u) => (u.uid === uid ? { ...u, ...data } : u)))
}

export function createUser(user: AppUser & { password: string }): void {
  const all = read<AppUser & { password: string }>(USERS_KEY)
  write(USERS_KEY, [...all, user])
}

export function deleteUser(uid: string): void {
  write(USERS_KEY, read<AppUser>(USERS_KEY).filter((u) => u.uid !== uid))
}

// ── Automations ────────────────────────────────────────────────
import type { Automation } from '../types'

const AUTO_KEY = 'automations'

export function getAutomations(): Automation[] {
  return read<Automation>(AUTO_KEY).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function saveAutomation(data: Omit<Automation, 'id'>): string {
  const id = generateId()
  const all = read<Automation>(AUTO_KEY)
  write(AUTO_KEY, [{ id, ...data }, ...all])
  return id
}

export function updateAutomation(id: string, data: Partial<Automation>): void {
  write(AUTO_KEY, read<Automation>(AUTO_KEY).map((a) => (a.id === id ? { ...a, ...data } : a)))
}

export function deleteAutomation(id: string): void {
  write(AUTO_KEY, read<Automation>(AUTO_KEY).filter((a) => a.id !== id))
}

// ── Settings ───────────────────────────────────────────────────
import type { MoodleConfig, MailchimpConfig } from '../types'

export function getMoodleConfig(): MoodleConfig | null {
  return readOne<MoodleConfig>('settings:moodle')
}

export function saveMoodleConfig(cfg: MoodleConfig): void {
  writeOne('settings:moodle', cfg)
}

export function getMailchimpConfig(): MailchimpConfig | null {
  return readOne<MailchimpConfig>('settings:mailchimp')
}

export function saveMailchimpConfig(cfg: MailchimpConfig): void {
  writeOne('settings:mailchimp', cfg)
}
