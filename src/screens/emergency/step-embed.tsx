import { router } from 'expo-router';
import { Phone } from 'phosphor-react-native';
import { Linking, View } from 'react-native';

import { Button } from '@/components/button';
import { CountdownView } from '@/components/countdown-view';
import { QuickAddChip } from '@/components/quick-add-chip';
import { AppText } from '@/components/text';
import type { PlaybookStep } from '@/domain/playbook';
import { useCountdowns } from '@/hooks/use-countdowns';
import { useMe } from '@/hooks/use-me';
import { useNow } from '@/hooks/use-now';
import type { EmergencySession } from '@/models/types';
import { checkIn } from '@/services/checkins';
import { useOutage } from '@/stores/outage-store';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/** Embedded tool on a step card (§12.4): checklist, timer, call, countdown, map, status. */
export function StepEmbed({ step, session, checked, onCheck }: { step: PlaybookStep; session: EmergencySession; checked: Set<string>; onCheck: (id: string) => void }) {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const outage = useOutage((s) => s.current);
  const { countdowns } = useCountdowns();
  const { me } = useMe();
  const now = useNow(1000);
  if (!snapshot) return null;

  switch (step.embed) {
    case 'power-out':
      return outage ? (
        <AppText variant="callout" color={t.colors.statusSafe}>
          Power marked out at {new Date(outage.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Countdowns are running.
        </AppText>
      ) : (
        <Button label="Power is out" variant="secondary" onPress={() => useOutage.getState().start()} />
      );
    case 'power-back':
      return outage ? <Button label="Power's back" variant="secondary" onPress={() => router.push('/(tabs)/(home)/power-back')} /> : null;
    case 'countdown': {
      const c = countdowns.find((x) => (step.subjectId ? x.ownerId === step.subjectId && (x.kind === 'device' || x.kind === 'medication') && step.id.includes(x.id) : x.kind === 'fridge' || x.kind === 'freezer')) ?? countdowns.find((x) => step.id.includes(x.id));
      return c ? <CountdownView c={c} /> : null;
    }
    case 'call': {
      const types = step.id.startsWith('out-6') ? ['utility'] : step.id.startsWith('win-dial') ? ['doctor'] : ['medical-supplier', 'doctor', 'utility'];
      const numbers = snapshot.contacts.filter((c) => types.includes(c.type));
      const supplier = snapshot.devices.filter((d) => d.supplierPhone);
      return (
        <View style={{ gap: 8 }}>
          {step.id === 'out-6' ? (
            <AppText variant="callout" secondary>
              Find your utility’s outage line on your bill. Many Loudoun homes are served by Dominion Energy.
            </AppText>
          ) : null}
          {numbers.map((c) => (
            <Button key={c.id} label={`Call ${c.name}`} icon={Phone} variant="secondary" onPress={() => Linking.openURL(`tel:${c.phone.replace(/[^\d+]/g, '')}`).catch(() => {})} />
          ))}
          {step.id !== 'out-6'
            ? supplier.map((d) => (
                <Button key={d.id} label={`Call ${d.supplierName ?? 'equipment supplier'}`} icon={Phone} variant="secondary" onPress={() => Linking.openURL(`tel:${d.supplierPhone!.replace(/[^\d+]/g, '')}`).catch(() => {})} />
              ))
            : null}
        </View>
      );
    }
    case 'timer': {
      const done = session.stepsCompleted.find((c) => c.stepId === 'haz-1');
      const since = done?.at ?? session.startedAt;
      const s = Math.max(0, Math.floor((now.getTime() - new Date(since).getTime()) / 1000));
      return (
        <View style={{ alignItems: 'center', gap: 4 }}>
          <AppText variant="display" tabular>
            {Math.floor(s / 3600)}:{String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}
          </AppText>
          <AppText variant="callout" secondary>
            Time sheltered. Stay until officials say it's safe.
          </AppText>
        </View>
      );
    }
    case 'status':
      return me ? (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button label="I'm safe" variant="safe" fullWidth={false} onPress={() => checkIn({ sessionId: session.id, memberId: me.id, status: 'safe', reportedBy: me.id })} />
          <Button label="Family status" variant="secondary" fullWidth={false} onPress={() => router.push('/emergency/family')} />
        </View>
      ) : null;
    case 'map':
    case 'meeting-point':
      return <Button label="Where to go" variant="secondary" onPress={() => router.push('/emergency/shelter')} />;
    case 'checklist': {
      const isCount = step.id === 'fir-7';
      const items = isCount
        ? [...snapshot.members.map((m) => ({ id: m.id, label: m.nickname || m.firstName })), ...snapshot.pets.map((p) => ({ id: p.id, label: p.name }))]
        : [
            ...snapshot.supplies.filter((s) => s.location === 'go-bag').slice(0, 8).map((s) => ({ id: s.id, label: s.name })),
            ...snapshot.medications.filter((m) => m.isCritical).map((m) => ({ id: m.id, label: m.brandName })),
          ];
      if (!items.length) return <AppText variant="callout" secondary>Build your go-bag list in Plan, then Supplies.</AppText>;
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {items.map((i) => (
            <QuickAddChip key={i.id} label={i.label} selected={checked.has(i.id)} onPress={() => onCheck(i.id)} />
          ))}
        </View>
      );
    }
    case 'call-911':
      return null;
    default:
      return null;
  }
}
