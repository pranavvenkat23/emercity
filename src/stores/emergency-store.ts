import { create } from 'zustand';

import { newId } from '@/data/ids';
import type { EmergencySession, Hazard, SessionOutcome, StepCompletion } from '@/models/types';

import { useSession } from './session-store';

/**
 * Emergency Mode state (§12). Sessions are EmergencySession records in the
 * encrypted database (they survive restarts, and sync across the household
 * in Phase 10). Only one session per hazard can be active; several hazards
 * can run at once (§12.1, §25.4). UI-only state (which hazard is focused,
 * minimized) lives here.
 */
export type StepStatus = StepCompletion['status'];

interface EmergencyUi {
  focus: Hazard | null;
  minimized: boolean;
  setFocus(h: Hazard | null): void;
  setMinimized(m: boolean): void;
}

export const useEmergencyUi = create<EmergencyUi>((set) => ({
  focus: null,
  minimized: false,
  setFocus: (focus) => set({ focus }),
  setMinimized: (minimized) => set({ minimized }),
}));

/** Active (not ended, not drill) sessions for the household. */
export function activeSessions(): EmergencySession[] {
  return (useSession.getState().snapshot?.sessions ?? []).filter((s) => !s.endedAt && !s.isDrill);
}

export function useActiveSessions(): EmergencySession[] {
  const sessions = useSession((s) => s.snapshot?.sessions);
  return (sessions ?? []).filter((s) => !s.endedAt && !s.isDrill).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

/** The session the hub shows: the focused hazard, else the earliest active. */
export function useCurrentSession(): EmergencySession | null {
  const active = useActiveSessions();
  const focus = useEmergencyUi((s) => s.focus);
  return active.find((s) => s.hazard === focus) ?? active[0] ?? null;
}

function me(): string | null {
  const { user, snapshot } = useSession.getState();
  if (!user || !snapshot) return null;
  return snapshot.members.find((m) => m.linkedUserId === user.uid)?.id ?? null;
}

export async function startEmergency(hazard: Hazard, opts: { trigger?: 'manual' | 'alert-prompt'; alertId?: string | null; isDrill?: boolean } = {}): Promise<EmergencySession> {
  const { snapshot, save, user } = useSession.getState();
  if (!snapshot) throw new Error('No household');
  const existing = snapshot.sessions.find((s) => s.hazard === hazard && !s.endedAt && !!s.isDrill === !!opts.isDrill);
  if (existing) {
    useEmergencyUi.setState({ focus: hazard, minimized: false });
    return existing;
  }
  const now = new Date().toISOString();
  const session: EmergencySession = {
    id: newId(),
    householdId: snapshot.household.id,
    createdAt: now,
    updatedAt: now,
    hazard,
    startedBy: user?.uid ?? null,
    startedAt: now,
    trigger: opts.trigger ?? 'manual',
    alertId: opts.alertId ?? null,
    endedAt: null,
    stepsCompleted: [],
    isDrill: !!opts.isDrill,
    insertedFallbacks: [],
    reassigned: {},
  };
  const saved = await save('sessions', session);
  useEmergencyUi.setState({ focus: hazard, minimized: false });
  return saved;
}

/** Done/skip/blocked on one phone shows on all (§12.4); first timestamp wins (§19.5). */
export async function setStepStatus(sessionId: string, stepId: string, status: StepStatus | null): Promise<void> {
  const { snapshot, save } = useSession.getState();
  const s = snapshot?.sessions.find((x) => x.id === sessionId);
  if (!s) return;
  const others = s.stepsCompleted.filter((c) => c.stepId !== stepId);
  const next = status ? [...others, { stepId, status, at: new Date().toISOString(), byMemberId: me() }] : others;
  await save('sessions', { ...s, stepsCompleted: next }, ['stepsCompleted']);
}

export async function addFallback(sessionId: string, fallbackId: string): Promise<void> {
  const { snapshot, save } = useSession.getState();
  const s = snapshot?.sessions.find((x) => x.id === sessionId);
  if (!s || (s.insertedFallbacks ?? []).includes(fallbackId)) return;
  await save('sessions', { ...s, insertedFallbacks: [...(s.insertedFallbacks ?? []), fallbackId] }, ['insertedFallbacks']);
}

export async function reassignStep(sessionId: string, stepId: string, memberId: string): Promise<void> {
  const { snapshot, save } = useSession.getState();
  const s = snapshot?.sessions.find((x) => x.id === sessionId);
  if (!s) return;
  await save('sessions', { ...s, reassigned: { ...(s.reassigned ?? {}), [stepId]: memberId } }, ['reassigned']);
}

export async function endEmergency(sessionId: string, outcome: SessionOutcome, notes: string): Promise<void> {
  const { snapshot, save } = useSession.getState();
  const s = snapshot?.sessions.find((x) => x.id === sessionId);
  if (!s) return;
  await save('sessions', { ...s, endedAt: new Date().toISOString(), outcome, notes }, ['endedAt', 'outcome', 'notes']);
  const remaining = activeSessions();
  useEmergencyUi.setState({ focus: remaining[0]?.hazard ?? null, minimized: false });
}

/** Status map for UI lookups. */
export function stepStatusMap(s: EmergencySession | null): Record<string, StepCompletion> {
  return Object.fromEntries((s?.stepsCompleted ?? []).map((c) => [c.stepId, c]));
}
