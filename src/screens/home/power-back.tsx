import { router } from 'expo-router';
import { CheckCircle, Phone, Plug, Snowflake } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { QuickAddChip } from '@/components/quick-add-chip';
import { Screen, SectionHeader } from '@/components/screen';
import { AppText } from '@/components/text';
import { displayName } from '@/domain/members';
import { FOOD_RULES } from '@/reference/food-rules';
import { useOutage } from '@/stores/outage-store';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

type Answer = 'yes' | 'no' | 'unsure';

/** Power restored (§11.6): medicine check, food guidance, device recharge. */
export function PowerBack() {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const save = useSession((s) => s.save);
  const current = useOutage((s) => s.current);
  const restored = useOutage((s) => s.restoredCheck);
  const end = useOutage((s) => s.end);
  const finish = useOutage((s) => s.finishRestoredCheck);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  // Arriving here ends the outage ("Power's back" from Home).
  useEffect(() => {
    if (current) end();
  }, [current, end]);

  if (!snapshot) return null;
  const record = restored ?? current;
  const hours = record?.endedAt ? (new Date(record.endedAt).getTime() - new Date(record.startedAt).getTime()) / 3_600_000 : 0;
  const meds = snapshot.medications.filter((m) => m.needsRefrigeration);
  const owner = (id: string) => {
    const m = snapshot.members.find((x) => x.id === id);
    return m ? displayName(m) : snapshot.pets.find((p) => p.id === id)?.name ?? '';
  };
  const devices = snapshot.devices.filter((d) => d.usesElectricity);
  const minutes = Math.max(1, Math.round(hours * 60));
  const outLabel =
    hours < 1 ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : `${hours.toFixed(1)} hours`;

  const done = async () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const d of devices) await save('devices', { ...d, batteryLastChargedDate: today }, ['batteryLastChargedDate']);
    await finish();
    router.back();
  };

  return (
    <Screen header={<AppBar title="Power's back" back />}>
      <Card>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <CheckCircle size={32} color={t.colors.statusSafe} weight="fill" />
          <AppText variant="headline" style={{ flex: 1 }}>
            The power was out for about {outLabel}. Countdowns have stopped.
          </AppText>
        </View>
      </Card>

      {meds.length ? <SectionHeader title="Medicines" /> : null}
      {meds.map((m) => {
        const a = answers[m.id];
        return (
          <Card key={m.id}>
            <View style={{ gap: t.space.sm }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Snowflake size={20} color={t.colors.hazardWinter} weight="bold" />
                <AppText variant="headline" style={{ flex: 1 }}>
                  Was {owner(m.ownerId)}'s {m.brandName} kept cold the whole time?
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <QuickAddChip label="Yes" selected={a === 'yes'} onPress={() => setAnswers({ ...answers, [m.id]: 'yes' })} />
                <QuickAddChip label="No" selected={a === 'no'} onPress={() => setAnswers({ ...answers, [m.id]: 'no' })} />
                <QuickAddChip label="Not sure" selected={a === 'unsure'} onPress={() => setAnswers({ ...answers, [m.id]: 'unsure' })} />
              </View>
              {a === 'no' || a === 'unsure' ? (
                <View style={{ gap: t.space.xs }}>
                  <AppText variant="body" weight="600" color={t.colors.severityUrgent}>
                    Call your pharmacist before using. Check for clumps, frost, or color change.
                  </AppText>
                  {m.pharmacyPhone ? (
                    <Button
                      label={`Call ${m.pharmacyName ?? 'pharmacy'}`}
                      icon={Phone}
                      variant="secondary"
                      onPress={() => Linking.openURL(`tel:${m.pharmacyPhone!.replace(/[^\d+]/g, '')}`).catch(() => {})}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          </Card>
        );
      })}

      <SectionHeader title="Food" />
      <Card>
        <View style={{ gap: t.space.xs }}>
          {hours >= FOOD_RULES.fridgeHours ? (
            <AppText variant="body">
              The power was off {FOOD_RULES.fridgeHours}+ hours. Throw out fridge food like meat, milk, eggs, and leftovers that were above 40°F for 2 hours or more.
            </AppText>
          ) : (
            <AppText variant="body">The fridge was likely fine if the door stayed closed. Check that it reads 40°F or below.</AppText>
          )}
          <AppText variant="body">Frozen food with ice crystals, or at 40°F or below, can be refrozen.</AppText>
          <AppText variant="body" weight="700">
            When in doubt, throw it out.
          </AppText>
          <AppText variant="footnote" secondary>
            Source: {FOOD_RULES.sourceName}
          </AppText>
        </View>
      </Card>

      {devices.length ? (
        <>
          <SectionHeader title="Devices" />
          <Card>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Plug size={24} color={t.colors.brandPrimary} />
              <AppText variant="body" style={{ flex: 1 }}>
                Recharge device batteries now. Emercity will remind you to check spare batteries in 30 days.
              </AppText>
            </View>
          </Card>
        </>
      ) : null}

      <Button label="Done" size="emergency" onPress={done} />
    </Screen>
  );
}
