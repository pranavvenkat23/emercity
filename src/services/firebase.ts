import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';

import type { KeyValueStore } from '@/data/record-store';

/**
 * Firebase client setup (§24.2). Config comes from EXPO_PUBLIC_* variables in
 * a git-ignored `.env` (see `.env.example`). These values identify the
 * project; data protection comes from Firestore security rules
 * (`firestore.rules`), not from hiding them.
 */
const config: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

/**
 * Developer builds can point at the local Firebase emulators
 * (`npx firebase emulators:start`) by setting EXPO_PUBLIC_FIREBASE_EMULATOR=1
 * in `.env.local`. Never set in release builds.
 */
export const useEmulators = __DEV__ && process.env.EXPO_PUBLIC_FIREBASE_EMULATOR === '1';
const EMULATOR_HOST = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST ?? '127.0.0.1';

/**
 * Auth persistence backed by the encrypted local database, so refresh tokens
 * are encrypted at rest with the Keychain/Keystore key (§22.4) instead of
 * sitting in plain AsyncStorage.
 */
function encryptedPersistence(kv: KeyValueStore): Persistence {
  // getReactNativePersistence ships in Firebase's React Native build, which
  // Metro selects at runtime; it is missing from the default type entry.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getReactNativePersistence } = require('firebase/auth') as {
    getReactNativePersistence: (storage: {
      getItem(key: string): Promise<string | null>;
      setItem(key: string, value: string): Promise<void>;
      removeItem(key: string): Promise<void>;
    }) => Persistence;
  };
  return getReactNativePersistence({
    getItem: (key) => kv.get(`auth:${key}`),
    setItem: (key, value) => kv.set(`auth:${key}`, value),
    removeItem: (key) => kv.remove(`auth:${key}`),
  });
}

/** Returns the Auth instance, or null when Firebase isn't configured. */
export function getFirebaseAuth(kv: KeyValueStore): Auth | null {
  if (!isFirebaseConfigured) return null;
  if (auth) return auth;
  app = getApps()[0] ?? initializeApp(config);
  try {
    auth = initializeAuth(app, { persistence: encryptedPersistence(kv) });
    if (useEmulators) connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
  } catch {
    // initializeAuth throws if called twice (e.g. fast refresh); reuse it.
    auth = getAuth(app);
  }
  return auth;
}

/**
 * Firestore without its own offline cache: the encrypted SQLite database is
 * the offline store (§19.4), so nothing health-related is cached unencrypted.
 * Call after getFirebaseAuth.
 */
export function getDb(): Firestore | null {
  if (!isFirebaseConfigured || !app) return null;
  if (firestore) return firestore;
  try {
    firestore = initializeFirestore(app, { ignoreUndefinedProperties: true });
    if (useEmulators) connectFirestoreEmulator(firestore, EMULATOR_HOST, 8080);
  } catch {
    firestore = getFirestore(app);
  }
  return firestore;
}
