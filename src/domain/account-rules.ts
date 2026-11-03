/**
 * Account rules from §5.2 and §19: pure, testable, shared by onboarding
 * screens and (later) Cloud Functions.
 */

export interface PasswordRule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

/** Shown as the inline rule list on ONB-02 (§5.2 "weak password"). */
export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'At least 10 characters', test: (pw) => pw.length >= 10 },
  { id: 'letter', label: 'Includes a letter', test: (pw) => /[A-Za-z]/.test(pw) },
  { id: 'number', label: 'Includes a number', test: (pw) => /\d/.test(pw) },
];

export function passwordIssues(pw: string): PasswordRule[] {
  return PASSWORD_RULES.filter((r) => !r.test(pw));
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export type AgeGateAnswer = 'under-13' | '13-17' | '18-plus';

/** §5.2: under 13 cannot create accounts; 13–17 can join but not create. */
export function ageGatePermissions(answer: AgeGateAnswer) {
  return {
    canCreateAccount: answer !== 'under-13',
    canCreateHousehold: answer === '18-plus',
    canJoinHousehold: answer !== 'under-13',
  };
}

/** §4.2 Household.inviteCode, 8 characters, no ambiguous glyphs (0/O, 1/I/L). */
export const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function isValidInviteCode(code: string): boolean {
  const normalized = normalizeInviteCode(code);
  return normalized.length === 8 && [...normalized].every((c) => INVITE_ALPHABET.includes(c));
}

export function normalizeInviteCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

/** Builds a code from 8 random bytes (caller supplies a CSPRNG source). */
export function inviteCodeFromBytes(bytes: Uint8Array): string {
  if (bytes.length < 8) throw new Error('Need 8 random bytes');
  let out = '';
  for (let i = 0; i < 8; i++) out += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  return out;
}

export type AuthErrorKind =
  | 'email-in-use'
  | 'wrong-credentials'
  | 'weak-password'
  | 'invalid-email'
  | 'network'
  | 'too-many-requests'
  | 'not-configured'
  | 'unknown';

/** Maps Firebase Auth error codes to the §5.2 error states. */
export function classifyAuthError(code: string | undefined): AuthErrorKind {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'email-in-use';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'wrong-credentials';
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return 'weak-password';
    case 'auth/invalid-email':
      return 'invalid-email';
    case 'auth/network-request-failed':
      return 'network';
    case 'auth/too-many-requests':
      return 'too-many-requests';
    case 'emercity/not-configured':
      return 'not-configured';
    default:
      return 'unknown';
  }
}

export const AUTH_ERROR_COPY: Record<AuthErrorKind, string> = {
  'email-in-use': 'That email already has an account. Sign in instead?',
  'wrong-credentials': "That email and password don't match.",
  'weak-password': 'Choose a stronger password.',
  'invalid-email': 'Check the email address.',
  network:
    'You need a connection to create an account. You can still explore a demo household.',
  'too-many-requests': 'Too many tries. Wait a few minutes and try again.',
  'not-configured':
    "Accounts aren't set up in this build yet. You can explore the demo household.",
  unknown: 'Something went wrong. Try again.',
};
