import { router } from 'expo-router';
import { CaretRight, Timer } from 'phosphor-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen, SectionHeader } from '@/components/screen';
import { AppText } from '@/components/text';
import { newId } from '@/data/ids';
import { completed, DRILL_BY_TYPE, DRILLS, elapsedMs, formatDuration, recommendDrill, type DrillType } from '@/domain/drills';
import { useTopRiskHazard } from '@/hooks/use-priorities';
import type { Drill } from '@/models/types';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

const short = (iso: string) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

/** PLAN-06 Drills home (§15.1). */
export function Drills() {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const save = useSession((s) => s.save);
  const topRisk = useTopRiskHazard();
  const history = useMemo(() => completed(snapshot?.drills ?? []), [snapshot]);
  if (!snapshot) return null;
  const rec = recommendDrill(snapshot.drills, topRisk, new Date());
  const last = history[0];

  const start = async (type: DrillType) => {
    const meta = DRILL_BY_TYPE[type];
    const nowIso = new Date().toISOString();
    const d: Drill = {
      id: newId(),
      householdId: snapshot.household.id,
      createdAt: nowIso,
      updatedAt: nowIso,
      type,
      hazard: meta.hazard ?? topRisk,
      startedAt: nowIso,
      endedAt: null,
      arrivals: [],
      skippedStepIds: [],
      blockedStepIds: [],
    };
    await save('drills', d);
    router.push({ pathname: '/(tabs)/plan/drill/[id]', params: { id: d.id } });
  };

  return (
    <Screen header={<AppBar title="Drills" back />}>
      <View style={{ gap: 4 }}>
        <AppText variant="title2">Practice makes it automatic</AppText>
        <AppText variant="subhead" secondary>
          {last ? `Last drill: ${DRILL_BY_TYPE[last.type].title.replace(' drill', '').toLowerCase()}, ${short(last.endedAt!)} · ${formatDuration(elapsedMs(last))}` : 'No drills yet'}
        </AppText>
      </View>

      <Card>
        <View style={{ gap: t.space.sm }}>
          <AppText variant="footnote" secondary>
            RECOMMENDED · {rec.reason}
          </AppText>
          <AppText variant="headline">{DRILL_BY_TYPE[rec.type].title}</AppText>
          <AppText variant="body" secondary>
            {DRILL_BY_TYPE[rec.type].detail}
          </AppText>
          <Button label="Start drill" icon={Timer} onPress={() => start(rec.type)} />
        </View>
      </Card>

      <SectionHeader title="All drills" />
      {DRILLS.map((d) => {
        const runs = history.filter((h) => h.type === d.type);
        return (
          <Card key={d.type} onPress={() => start(d.type)} accessibilityLabel={`Start ${d.title}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="headline">{d.title}</AppText>
                <AppText variant="subhead" secondary>
                  {d.detail}
                </AppText>
                {runs[0] ? (
                  <AppText variant="footnote" secondary>
                    Last: {short(runs[0].endedAt!)} · {formatDuration(elapsedMs(runs[0]))}
                  </AppText>
                ) : null}
              </View>
              {runs.length > 1 ? <Trend values={runs.slice(0, 8).reverse().map(elapsedMs)} color={t.colors.brandAccent} /> : null}
              <CaretRight size={18} color={t.colors.textSecondary} />
            </View>
          </Card>
        );
      })}

      <SectionHeader title="History" />
      {history.length ? (
        <Card padded={false}>
          {history.map((h, i) => (
            <View key={h.id} style={{ flexDirection: 'row', padding: t.space.md, borderTopWidth: i ? 1 : 0, borderColor: t.colors.borderDefault, gap: t.space.sm }}>
              <AppText variant="body" style={{ flex: 1 }}>
                {DRILL_BY_TYPE[h.type].title}
              </AppText>
              <AppText variant="subhead" secondary tabular>
                {short(h.endedAt!)} · {formatDuration(elapsedMs(h))} · {h.arrivals.length}
              </AppText>
            </View>
          ))}
        </Card>
      ) : (
        <EmptyState icon={Timer} message="Practice once so everyone knows what to do." action={{ label: 'Start a fire drill', onPress: () => start('fire-escape') }} />
      )}
    </Screen>
  );
}

/** Small trend line per drill type; shorter is better, so lower is drawn lower. */
function Trend({ values, color }: { values: number[]; color: string }) {
  const w = 56;
  const h = 24;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - min) / (max - min || 1)) * (h - 4)}`).join(' ');
  return (
    <Svg width={w} height={h} accessibilityLabel="Time trend">
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={2} />
    </Svg>
  );
}
