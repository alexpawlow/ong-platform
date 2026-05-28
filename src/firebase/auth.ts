import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User,
} from 'firebase/auth'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { auth, firebaseConfig } from './config'

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth!, email, password)
}

export async function logout() {
  return signOut(auth!)
}

export async function changePassword(
  user: User,
  currentPassword: string,
  newPassword: string
) {
  const credential = EmailAuthProvider.credential(user.email!, currentPassword)
  await reauthenticateWithCredential(user, credential)
  return updatePassword(user, newPassword)
}

// Cria um usuário no Firebase Auth sem deslogar o admin atual
export async function adminCreateUser(email: string, password: string): Promise<string> {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`)
  const secondaryAuth = getAuth(secondaryApp)
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    return cred.user.uid
  } finally {
    await deleteApp(secondaryApp)
  }
}
