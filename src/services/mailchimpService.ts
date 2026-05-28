// Mailchimp calls DEVEM ser feitas via backend (Firebase Cloud Functions)
// para não expor a API key no cliente. Este arquivo define os tipos e
// as chamadas ao proxy.

export interface MailchimpAudience {
  id: string
  name: string
  memberCount: number
}

export interface MailchimpTag {
  id: number
  name: string
  memberCount: number
}

// Proxy via Firebase Cloud Function — configure em functions/src/mailchimp.ts
const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_URL || ''

async function callProxy<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(`${FUNCTIONS_BASE}/mailchimp${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Mailchimp proxy error ${res.status}`)
  }
  return res.json()
}

export async function getAudiences(): Promise<MailchimpAudience[]> {
  return callProxy<MailchimpAudience[]>('/audiences')
}

export async function addMemberToList(
  listId: string,
  email: string,
  mergeFields: Record<string, string>,
  tags: string[]
): Promise<void> {
  return callProxy('/members/add', { listId, email, mergeFields, tags })
}

export async function tagMember(
  listId: string,
  email: string,
  tags: string[]
): Promise<void> {
  return callProxy('/members/tag', { listId, email, tags })
}

// Mock data para demonstração
export const MOCK_AUDIENCES: MailchimpAudience[] = [
  { id: 'abc123', name: 'Alunos — Rede Pública', memberCount: 842 },
  { id: 'def456', name: 'Leads — Site Institucional', memberCount: 1234 },
  { id: 'ghi789', name: 'Concluintes 2024', memberCount: 456 },
]

export const MOCK_TAGS: MailchimpTag[] = [
  { id: 1, name: 'concluinte', memberCount: 456 },
  { id: 2, name: 'matriculado', memberCount: 842 },
  { id: 3, name: 'inativo-7d', memberCount: 123 },
  { id: 4, name: 'gestor', memberCount: 128 },
  { id: 5, name: 'professor', memberCount: 210 },
]
