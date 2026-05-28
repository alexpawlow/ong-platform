import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import { db } from './config'
import type { AppUser, Automation, MoodleConfig, MailchimpConfig } from '../types'

function requireDb() {
  if (!db) throw new Error('Firebase não configurado. Defina as variáveis VITE_FIREBASE_* no .env')
  return db
}

// Users
export async function getUsers(): Promise<AppUser[]> {
  const snap = await getDocs(collection(requireDb(), 'users'))
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser))
}

export async function getUserById(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(requireDb(), 'users', uid))
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as AppUser) : null
}

export async function createUser(uid: string, data: Omit<AppUser, 'uid'>) {
  return setDoc(doc(requireDb(), 'users', uid), { ...data, createdAt: new Date().toISOString() })
}

export async function updateUser(uid: string, data: Partial<AppUser>) {
  return updateDoc(doc(requireDb(), 'users', uid), data as DocumentData)
}

export async function deleteUser(uid: string) {
  return deleteDoc(doc(requireDb(), 'users', uid))
}

// Automations
export async function getAutomations(): Promise<Automation[]> {
  const snap = await getDocs(
    query(collection(requireDb(), 'automations'), orderBy('createdAt', 'desc'))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Automation))
}

export async function saveAutomation(data: Omit<Automation, 'id'>): Promise<string> {
  const ref = doc(collection(requireDb(), 'automations'))
  await setDoc(ref, { ...data, createdAt: new Date().toISOString() })
  return ref.id
}

export async function updateAutomation(id: string, data: Partial<Automation>) {
  return updateDoc(doc(requireDb(), 'automations', id), data as DocumentData)
}

export async function deleteAutomation(id: string) {
  return deleteDoc(doc(requireDb(), 'automations', id))
}

// Settings
export async function getMoodleConfig(): Promise<MoodleConfig | null> {
  const snap = await getDoc(doc(requireDb(), 'settings', 'moodle'))
  return snap.exists() ? (snap.data() as MoodleConfig) : null
}

export async function saveMoodleConfig(config: MoodleConfig) {
  return setDoc(doc(requireDb(), 'settings', 'moodle'), config)
}

export async function getMailchimpConfig(): Promise<MailchimpConfig | null> {
  const snap = await getDoc(doc(requireDb(), 'settings', 'mailchimp'))
  return snap.exists() ? (snap.data() as MailchimpConfig) : null
}

export async function saveMailchimpConfig(config: MailchimpConfig) {
  return setDoc(doc(requireDb(), 'settings', 'mailchimp'), config)
}
