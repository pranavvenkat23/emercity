import { router } from 'expo-router';
import { Lightbulb } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { QuickAddChip } from '@/components/quick-add-chip';
import { AppText } from '@/components/text';
import { afterActionSuggestions } from '@/domain/playbook';
import { useMe } from '@/hooks/use-me';
import { usePlaybook } from '@/hooks/use-playbook';
import { useStatusBarStyle } from '@/hooks/use-status-bar';
import type { SessionOutcome } from '@/models/types';
import { endEmergency, stepStatusMap, useCurrentSession } from '@/stores/emergency-store';
import { useOutage } from '@/stores/outage-store';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

import { NotRunning } from './not-running';

const OUTCOMES: { value: SessionOutcome; label: string }[] = [
  { value: 'safe-at-home', label: 'Safe at home' },
  { value: 'evacuated', label: 'Evacuated' },
  { value: 'sheltered', label: 'Went to a shelter' },
  { value: 'other', label: 'Other' },
];

/** EM-08 End Emergency Mode / after-action (§12.7). */
export function EndEmergency() {
  const t = useTheme();
  useStatusBarStyle('light');
  const insets = useSafeAreaInsets();
  const session = useCurrentSession();
  const snapshot = useSession((s) => s.snapshot);
  const { steps } = usePlaybook(session);
  const { me } = useMe();
  const outage = useOutage((s) => s.current);
  const [outcome, setOutcome] = useState<SessionOutcome | null>(null);
  const [note, setNote] = useState('');
  const status = stepStatusMap(session);
  const tips = useMemo(() => (snapshot && session ? afterActionSuggestions(steps, status, snapshot) : []), [snapshot, session, steps, status]);
  if (!session || !snapshot) return <NotRunning />;

  // §19.3: owners and adults end for everyone; teens leave on their own phone.
  const isAdult = !me || me.role === 'adult' || me.role === 'older-adult';
  const counts = { done: 0, skipped: 0, blocked: 0 };
  for (const s of steps) {
    const st = status[s.id]?.status;
    if (st) counts[st]++;
  }
  const minutes = Math.max(0, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60_000));

  return (
    <ScrollView style={{ backgroundColor: t.colors.surfaceBase }} contentContainerStyle={{ padding: t.space.md, gap: t.space.md, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}>
      <AppText variant="title1" accessibilityRole="header">
        {isAdult ? 'End Emergency Mode for everyone?' : 'Leave Emergency Mode on this phone?'}
      </AppText>
      <AppText variant="headline">How did it end?</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {OUTCOMES.map((o) => (
          <QuickAddChip key={o.value} label={o.label} selected={outcome === o.value} onPress={() => setOutcome(o.value)} />
        ))}
      </View>

      <Card>
        <View style={{ gap: 6 }}>
          <AppText variant="headline">Summary</AppText>
          <AppText variant="callout">
            {counts.done} done · {counts.skipped} skipped · {counts.blocked} couldn&apos;t do · {steps.length - counts.done - counts.skipped - counts.blocked} not reached
          </AppText>
          <AppText variant="callout" secondary>
            Time: {minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} m`}
          </AppText>
        </View>
      </Card>

      {tips.length ? (
        <Card>
          <View style={{ gap: t.space.xs }}>
            {tips.map((tip) => (
              <View key={tip} style={{ flexDirection: 'row', gap: 8 }}>
                <Lightbulb size={20} color={t.colors.severityImportant} />
                <AppText variant="callout" style={{ flex: 1 }}>
                  {tip}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <AppText variant="headline">What would you change?</AppText>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Optional note"
        placeholderTextColor={t.colors.textSecondary}
        multiline
        maxLength={500}
        accessibilityLabel="What would you change? Optional note"
        style={{ minHeight: 96, color: t.colors.textPrimary, backgroundColor: t.colors.surfaceCard, borderColor: t.colors.borderDefault, borderWidth: 1, borderRadius: t.radius.button, padding: t.space.sm, fontSize: t.type.callout.fontSize, textAlignVertical: 'top' }}
      />

      <Button
        label={isAdult ? 'End Emergency Mode' : 'Leave on this phone'}
        size="emergency"
        disabled={!outcome}
        accessibilityHint={outcome ? undefined : 'Pick how it ended first'}
        onPress={async () => {
          await endEmergency(session.id, outcome!, note);
          // If the power is still out, Home keeps showing the countdowns; the
          // power-restored check (§11.6) runs when someone taps "Power's back".
          router.dismissTo('/(tabs)/(home)');
        }}
      />
      <Button label="Keep going" variant="ghost" onPress={() => router.back()} />
      {outage ? (
        <AppText variant="footnote" secondary>
          The power is still marked out. Ending Emergency Mode keeps the countdowns running until someone taps “Power’s back.”
        </AppText>
      ) : null}
    </ScrollView>
  );
}
