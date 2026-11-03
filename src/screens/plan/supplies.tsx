import { router, useFocusEffect } from 'expo-router';
import { CaretDown, CaretRight, CheckSquare, Package, Plus, Square } from 'phosphor-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ChipSelect, TextField } from '@/components/form';
import { MemberAvatar } from '@/components/member-avatar';
import { ProgressRing } from '@/components/progress-ring';
import { QuickAddChip } from '@/components/quick-add-chip';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { TierIcon } from '@/components/severity';
import { AppText } from '@/components/text';
import { newId } from '@/data/ids';
import { displayName } from '@/domain/members';
import { expiryState } from '@/domain/supplies';
import { useSupplies } from '@/hooks/use-supplies';
import type { SupplyCategory, SupplyItem, SupplyLocation } from '@/models/types';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

export const CATEGORY_LABEL: Record<SupplyCategory, string> = {
  water: 'Water',
  food: 'Food',
  medical: 'Medical',
  baby: 'Baby',
  pet: 'Pets',
  documents: 'Documents',
  'light-power': 'Light and power',
  tools: 'Tools',
  hygiene: 'Hygiene',
  clothing: 'Clothing and warmth',
  comfort: 'Comfort',
};
const ORDER: SupplyCategory[] = ['water', 'food', 'medical', 'baby', 'pet', 'documents', 'light-power', 'tools', 'hygiene', 'clothing', 'comfort'];
type Filter = 'all' | 'missing' | 'expiring' | 'critical';

/** PLAN-04 Supplies (§17.1). */
export function Supplies() {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const save = useSession((s) => s.save);
  const { sync, built } = useSupplies();
  const [kit, setKit] = useState<SupplyLocation>('go-bag');
  const [filter, setFilter] = useState<Filter>('all');
  const [closed, setClosed] = useState<Set<SupplyCategory>>(new Set());
  const [adding, setAdding] = useState<SupplyCategory | null>(null);
  const [newName, setNewName] = useState('');
  const now = new Date();

  // Keep the list in step with the household whenever the screen opens (§17.2).
  useFocusEffect(
    useCallback(() => {
      if (built) sync();
    }, [built, sync]),
  );

  const items = useMemo(() => (snapshot?.supplies ?? []).filter((s) => s.location === kit), [snapshot, kit]);
  const shown = items.filter((s) => {
    if (filter === 'missing') return s.quantityHave < s.quantityNeeded;
    if (filter === 'expiring') return expiryState(s, now) === 'soon' || expiryState(s, now) === 'expired';
    if (filter === 'critical') return s.tier === 'critical';
    return true;
  });
  if (!snapshot) return null;
  const ready = items.filter((s) => s.quantityHave >= s.quantityNeeded && expiryState(s, now) !== 'expired').length;
  const expiring = items.filter((s) => expiryState(s, now) === 'soon').length;

  if (!built) {
    return (
      <Screen header={<AppBar title="Supplies" back />}>
        <EmptyState icon={Package} message="We'll build your list from your household." action={{ label: 'Build my list', onPress: () => sync() }} />
      </Screen>
    );
  }

  const toggleHave = (s: SupplyItem) => save('supplies', { ...s, quantityHave: s.quantityHave >= s.quantityNeeded ? 0 : s.quantityNeeded, lastCheckedDate: now.toISOString().slice(0, 10) }, ['quantityHave', 'lastCheckedDate']);

  return (
    <Screen header={<AppBar title="Supplies" back />}>
      <SegmentedControl
        accessibilityLabel="Kit"
        value={kit}
        onChange={setKit}
        options={[
          { value: 'go-bag', label: 'Go-bag' },
          { value: 'home-kit', label: 'Home kit' },
          { value: 'car', label: 'Car' },
        ]}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <ProgressRing size={64} stroke={8} progress={items.length ? ready / items.length : 0} color={t.colors.brandAccent} trackColor={t.colors.surfaceSunken}>
          <AppText variant="subhead" weight="700" tabular>
            {items.length ? Math.round((ready / items.length) * 100) : 0}%
          </AppText>
        </ProgressRing>
        <AppText variant="headline" style={{ flex: 1 }}>
          {ready} of {items.length} items{expiring ? ` · ${expiring} expiring soon` : ''}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['all', 'missing', 'expiring', 'critical'] as Filter[]).map((f) => (
          <QuickAddChip key={f} label={f[0].toUpperCase() + f.slice(1)} selected={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>

      {ORDER.map((cat) => {
        const list = shown.filter((s) => s.category === cat);
        if (!list.length && (filter !== 'all' || kit === 'car' ? true : !items.some((s) => s.category === cat))) {
          if (!(filter === 'all' && adding === cat)) return null;
        }
        const isClosed = closed.has(cat);
        return (
          <Card key={cat} padded={false}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: !isClosed }}
              onPress={() => setClosed((c) => new Set(c.has(cat) ? [...c].filter((x) => x !== cat) : [...c, cat]))}
              style={{ flexDirection: 'row', alignItems: 'center', padding: t.space.md, minHeight: 52 }}>
              <AppText variant="headline" style={{ flex: 1 }}>
                {CATEGORY_LABEL[cat]}
              </AppText>
              {isClosed ? <CaretRight size={18} color={t.colors.textSecondary} /> : <CaretDown size={18} color={t.colors.textSecondary} />}
            </Pressable>
            {!isClosed
              ? list.map((s) => {
                  const have = s.quantityHave >= s.quantityNeeded;
                  const exp = expiryState(s, now);
                  const owner = s.linkedMemberId ? snapshot.members.find((m) => m.id === s.linkedMemberId) : null;
                  return (
                    <View key={s.id} style={[styles.row, { borderColor: t.colors.borderDefault }]}>
                      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: have }} accessibilityLabel={`Have ${s.name}`} onPress={() => toggleHave(s)} style={styles.check}>
                        {have ? <CheckSquare size={26} color={t.colors.statusSafe} weight="fill" /> : <Square size={26} color={t.colors.textSecondary} />}
                      </Pressable>
                      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/(tabs)/plan/supply/[id]', params: { id: s.id } })} style={{ flex: 1, gap: 2, paddingVertical: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {s.tier && s.tier !== 'standard' ? <TierIcon tier={s.tier} size={16} /> : null}
                          <AppText variant="body" style={{ flexShrink: 1 }}>
                            {s.name}
                          </AppText>
                        </View>
                        <AppText variant="footnote" secondary>
                          {s.quantityHave} / {s.quantityNeeded} {s.unit}
                          {s.expirationDate ? (
                            <AppText variant="footnote" color={exp === 'expired' ? t.colors.severityCritical : exp === 'soon' ? t.colors.severityImportant : t.colors.textSecondary}>
                              {' '}· {exp === 'expired' ? 'expired' : 'expires'} {new Date(`${s.expirationDate}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </AppText>
                          ) : null}
                        </AppText>
                      </Pressable>
                      {owner ? <MemberAvatar name={displayName(owner)} size={30} /> : null}
                    </View>
                  );
                })
              : null}
            {!isClosed && filter === 'all' ? (
              <Pressable accessibilityRole="button" onPress={() => setAdding(cat)} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', padding: t.space.md, minHeight: 48 }}>
                <Plus size={18} color={t.colors.brandPrimary} weight="bold" />
                <AppText variant="subhead" color={t.colors.brandPrimary}>
                  Add item
                </AppText>
              </Pressable>
            ) : null}
          </Card>
        );
      })}
      {kit === 'car' && !items.length ? (
        <AppText variant="body" secondary>
          Add what you keep in the car, like a blanket, water, a flashlight, and a phone charger.
        </AppText>
      ) : null}
      {kit === 'car' ? <Button label="Add car item" icon={Plus} variant="secondary" onPress={() => setAdding('tools')} /> : null}

      <Button label="Check everything" variant="secondary" onPress={() => router.push({ pathname: '/(tabs)/plan/supply-check', params: { kit } })} />

      <BottomSheet visible={!!adding} onClose={() => setAdding(null)} title="Add item">
        <TextField label="Item" value={newName} onChange={setNewName} />
        <ChipSelect label="Category" value={adding} onChange={(v) => setAdding(v)} options={ORDER.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} />
        <Button
          label="Add"
          disabled={!newName.trim()}
          onPress={async () => {
            const nowIso = new Date().toISOString();
            await save('supplies', { id: newId(), householdId: snapshot.household.id, createdAt: nowIso, updatedAt: nowIso, category: adding!, name: newName.trim(), quantityNeeded: 1, quantityHave: 0, unit: 'each', location: kit, isTemplateItem: false });
            setNewName('');
            setAdding(null);
          }}
        />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 16, borderTopWidth: StyleSheet.hairlineWidth, minHeight: 56 },
  check: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
});
