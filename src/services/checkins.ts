import { newId } from '@/data/ids';
import type { CheckInStatus } from '@/models/types';
import { useSession } from '@/stores/session-store';

/**
 * Records a check-in (§12.7). Saved locally first and queued for sync;
 * when offline the queue holds it until signal returns ("Will send when
 * connected"), and the SMS fallback is offered.
 */
export async function checkIn(input: {
  sessionId: string;
  memberId: string;
  status: CheckInStatus;
  reportedBy: string;
  message?: string;
  location?: { lat: number; lng: number } | null;
}): Promise<void> {
  const { save } = useSession.getState();
  const now = new Date().toISOString();
  await save('checkIns', {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    householdId: useSession.getState().householdId ?? undefined,
    sessionId: input.sessionId,
    memberId: input.memberId,
    status: input.status,
    message: input.message,
    location: input.location ?? null,
    timestamp: now,
    reportedBy: input.reportedBy,
  });
}
