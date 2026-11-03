import { router } from 'expo-router';
import { CheckCircle } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import type { SupplyLocation } from '@/models/types';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/** "Check everything" walkthrough (§17.1 item 7): one item per screen; updates lastCheckedDate. */
export function SupplyCheck({ kit }: { kit: SupplyLocation }) {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const save = useSession((s) => s.save);
  const items = useMemo(() => (snapshot?.supplies ?? []).filter((s) => s.location === kit), [snapshot, kit]);
  const [i, setI] = useState(0);
  const today = new Date().toISOString().slice(0, 10);
  const item = items[i];

  const answer = async (have: boolean) => {
    if (!item) return;
    await save('supplies', { ...item, quantityHave: have ? Math.max(item.quantityHave, item.quantityNeeded) : 0, lastCheckedDate: today }, ['quantityHave', 'lastCheckedDate']);
    setI(i + 1);
  };

  return (
    <Screen header={<AppBar title="Check everything" back />}>
      {item ? (
        <>
          <AppText variant="footnote" secondary>
            {i + 1} of {items.length}
          </AppText>
          <Card style={{ minHeight: 200, justifyContent: 'center', gap: t.space.md }}>
            <AppText variant="title1">Do you still have {item.name.toLowerCase().startsWith('a ') ? '' : ''}{item.name}?</AppText>
            <AppText variant="body" secondary>
              Need {item.quantityNeeded} {item.unit}
              {item.category === 'light-power' ? '. Batteries working?' : ''}
              {item.expirationDate ? `. Expires ${new Date(`${item.expirationDate}T12:00:00`).toLocaleDateString()}` : ''}
            </AppText>
          </Card>
          <Button label="Yes, I have it" variant="safe" size="emergency" onPress={() => answer(true)} />
          <Button label="No, I need it" variant="secondary" onPress={() => answer(false)} />
          <Button label="Skip" variant="ghost" onPress={() => setI(i + 1)} />
        </>
      ) : (
        <View style={{ alignItems: 'center', gap: t.space.md, marginTop: 48 }}>
          <CheckCircle size={56} color={t.colors.statusSafe} weight="fill" />
          <AppText variant="title2">All checked</AppText>
          <Button label="Done" onPress={() => router.back()} />
        </View>
      )}
    </Screen>
  );
}
