import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';

import type { KeyValueStore } from '@/data/record-store';

import { getFirebaseAuth } from './firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
}

class AuthError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

function requireAuth(kv: KeyValueStore) {
  const auth = getFirebaseAuth(kv);
  if (!auth) throw new AuthError('emercity/not-configured');
  return auth;
}

function toUser(u: FirebaseUser): AuthUser {
  return { uid: u.uid, email: u.email };
}

/** Email + password sign-up (§5.2). Apple / Google arrive with Phase 10 setup. */
export async function signUpWithEmail(kv: KeyValueStore, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(requireAuth(kv), email.trim(), password);
  return toUser(cred.user);
}

export async function signInWithEmail(kv: KeyValueStore, email: string, password: string) {
  const cred = await signInWithEmailAndPassword(requireAuth(kv), email.trim(), password);
  return toUser(cred.user);
}

export async function sendPasswordReset(kv: KeyValueStore, email: string) {
  await sendPasswordResetEmail(requireAuth(kv), email.trim());
}

export async function signOut(kv: KeyValueStore) {
  const auth = getFirebaseAuth(kv);
  if (auth) await fbSignOut(auth);
}

/** Subscribes to sign-in changes; a no-op when Firebase isn't configured. */
export function subscribeToAuth(kv: KeyValueStore, cb: (user: AuthUser | null) => void) {
  const auth = getFirebaseAuth(kv);
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (u) => cb(u ? toUser(u) : null));
}

/** Pulls the Firebase error code off an unknown thrown value. */
export function authErrorCode(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'code' in e && typeof e.code === 'string') return e.code;
  return undefined;
}
