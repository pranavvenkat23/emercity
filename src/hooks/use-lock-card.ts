import { useCallback, useEffect, useMemo, useState } from 'react';

import { buildCardContent, contentKey, DEFAULT_BLOCKS, DEFAULT_ORDER, type CardContent, type CardSettings } from '@/domain/lock-card';
import { useSession } from '@/stores/session-store';

import { useMe } from './use-me';
import { useTopTiers } from './use-priorities';

const key = (h: string, owner: string) => `card.${h}.${owner}`;

/** Card settings per owner (each account holder can make their own, §14.3). */
export function useLockCard(ownerId?: string): {
  settings: CardSettings | null;
  content: CardContent | null;
  update: (patch: Partial<CardSettings>) => Promise<void>;
  markSaved: () => Promise<void>;
  outOfDate: boolean;
} {
  const db = useSession((s) => s.db);
  const snapshot = useSession((s) => s.snapshot);
  const { me } = useMe();
  const tiers = useTopTiers();
  const owner = snapshot?.members.find((m) => m.id === (ownerId ?? me?.id)) ?? me;
  const [settings, setSettings] = useState<CardSettings | null>(null);

  useEffect(() => {
    if (!db || !snapshot || !owner) return;
    db.kv.getJSON<CardSettings>(key(snapshot.household.id, owner.id)).then((s) =>
      setSettings(s ?? { ownerId: owner.id, blocks: { ...DEFAULT_BLOCKS }, order: [...DEFAULT_ORDER], theme: 'dark', textSize: 'standard', savedContentKey: null }),
    );
  }, [db, snapshot, owner]);

  const content = useMemo(() => (snapshot && owner ? buildCardContent(snapshot, owner, tiers, new Date()) : null), [snapshot, owner, tiers]);

  const update = useCallback(
    async (patch: Partial<CardSettings>) => {
      if (!settings || !db || !snapshot) return;
      const next = { ...settings, ...patch };
      setSettings(next);
      await db.kv.setJSON(key(snapshot.household.id, next.ownerId), next);
    },
    [settings, db, snapshot],
  );

  const markSaved = useCallback(async () => {
    if (content) await update({ savedContentKey: contentKey(content) });
  }, [content, update]);

  const outOfDate = !!settings?.savedContentKey && !!content && settings.savedContentKey !== contentKey(content);
  return { settings, content, update, markSaved, outOfDate };
}
