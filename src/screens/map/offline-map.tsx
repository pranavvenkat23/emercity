import { OfflineManager } from '@maplibre/maplibre-react-native';
import { CloudArrowDown, CloudCheck } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { AppText } from '@/components/text';
import { BASEMAP_STYLE, boundsAround, tileCount } from '@/domain/map';
import { KV_OFFLINE_PACKAGE } from '@/hooks/use-readiness';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

const MIN_Z = 8;
const MAX_Z = 14;

/**
 * Saves the basemap within 10 miles of home for use without signal (§16.1,
 * §21). Risk overlays (flood zones) are live layers and are not saved.
 */
export function OfflineMapButton() {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const db = useSession((s) => s.db);
  const online = useSession((s) => s.online);
  const [pct, setPct] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const a = snapshot?.household.address;
  const id = snapshot ? `home-${snapshot.household.id}` : '';

  useEffect(() => {
    db?.kv.get(KV_OFFLINE_PACKAGE).then(setSavedAt);
  }, [db]);

  if (a?.lat == null || a.lng == null || !db) return null;
  const bounds = boundsAround(a.lat, a.lng, 10);
  const tiles = tileCount(bounds, MIN_Z, MAX_Z);

  const save = async () => {
    setError(null);
    setPct(0);
    try {
      await OfflineManager.deletePack(id).catch(() => {});
      await OfflineManager.createPack(
        { mapStyle: BASEMAP_STYLE, bounds, minZoom: MIN_Z, maxZoom: MAX_Z, metadata: { id } },
        async (_pack, status) => {
          setPct(Math.round(status.percentage));
          if (status.state === 'complete') {
            const at = new Date().toISOString();
            await db.kv.set(KV_OFFLINE_PACKAGE, at);
            setSavedAt(at);
            setPct(null);
          }
        },
        (_pack, err) => {
          setError(err.message || 'Download stopped.');
          setPct(null);
        },
      );
    } catch {
      setError('Couldn’t save the map. Try again on Wi-Fi.');
      setPct(null);
    }
  };

  return (
    <View style={{ gap: 6 }}>
      {savedAt && pct == null ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <CloudCheck size={20} color={t.colors.statusSafe} />
          <AppText variant="footnote" secondary style={{ flex: 1 }}>
            Map within 10 miles saved for offline on {new Date(savedAt).toLocaleDateString()}.
          </AppText>
        </View>
      ) : null}
      <Button
        label={pct != null ? `Saving map… ${pct}%` : savedAt ? 'Update offline map' : 'Save map for offline'}
        icon={CloudArrowDown}
        variant="secondary"
        disabled={pct != null || online === false}
        onPress={save}
      />
      <AppText variant="caption" secondary>
        About {tiles.toLocaleString()} map tiles. Use Wi-Fi. Flood zones and live layers need a connection.
      </AppText>
      {error ? (
        <AppText variant="footnote" color={t.colors.severityImportant}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
