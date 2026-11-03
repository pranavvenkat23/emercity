import { arrayUnion, deleteDoc, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

import type { Member } from '@/models/types';
import { useSession } from '@/stores/session-store';

import { pullHousehold } from './cloud-sync';
import { getDb } from './firebase';

/**
 * Invites without Cloud Functions (HH-10, §19.2). The invite document is
 * keyed by its code; the security rules let anyone signed in read one code
 * (never list them) and let a joiner add only themselves to the household's
 * roles, at their own age role, while the code is unexpired.
 */

export interface InviteInfo {
  householdId: string;
  householdName: string;
  inviterFirstName: string;
  forMemberId: string | null;
  expiresAt: Date;
}

export async function publishInvite(code: string, info: { householdId: string; householdName: string; inviterFirstName: string; forMemberId: string | null; expiresAt: Date }) {
  const fs = getDb();
  const uid = useSession.getState().user?.uid;
  if (!fs || !uid) throw new Error('not-signed-in');
  await setDoc(doc(fs, 'invites', code), { ...info, expiresAt: Timestamp.fromDate(info.expiresAt), createdBy: uid, createdAt: Timestamp.now() });
}

export async function revokeInvite(code: string) {
  const fs = getDb();
  if (fs) await deleteDoc(doc(fs, 'invites', code)).catch(() => {});
}

export async function lookupInvite(code: string): Promise<InviteInfo | 'not-found' | 'expired'> {
  const fs = getDb();
  if (!fs) throw new Error('not-configured');
  const snap = await getDoc(doc(fs, 'invites', code));
  if (!snap.exists()) return 'not-found';
  const d = snap.data();
  const expiresAt = (d.expiresAt as Timestamp).toDate();
  if (expiresAt.getTime() <= Date.now()) return 'expired';
  return { householdId: d.householdId, householdName: d.householdName ?? 'A household', inviterFirstName: d.inviterFirstName ?? '', forMemberId: d.forMemberId ?? null, expiresAt };
}

/** Adds this account to the household, then downloads it to this phone. */
export async function joinHousehold(code: string, invite: InviteInfo, isAdult18Plus: boolean): Promise<void> {
  const fs = getDb();
  const uid = useSession.getState().user?.uid;
  if (!fs || !uid) throw new Error('not-signed-in');
  await updateDoc(doc(fs, 'households', invite.householdId), { [`roles.${uid}`]: isAdult18Plus ? 'adult' : 'teen', joinCode: code });
  await setDoc(doc(fs, 'users', uid), { householdIds: arrayUnion(invite.householdId) }, { merge: true });
  await pullHousehold(invite.householdId);
}

/** "I'm Ben": links this account to an existing member record (§19.2). */
export async function linkMember(householdId: string, member: Member): Promise<void> {
  const fs = getDb();
  const uid = useSession.getState().user?.uid;
  if (!fs || !uid) throw new Error('not-signed-in');
  const now = new Date().toISOString();
  await updateDoc(doc(fs, 'households', householdId, 'members', member.id), { linkedUserId: uid, updatedAt: now, updatedBy: uid });
  await useSession.getState().db?.records.applyRemote('members', householdId, { ...member, linkedUserId: uid, updatedAt: now });
}
