import { Globe, Phone, Plus } from 'phosphor-react-native';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ChipSelect, SwitchRow, TextField } from '@/components/form';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { newId } from '@/data/ids';
import type { Contact, ContactType } from '@/models/types';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

export const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  emergency: 'Emergency contact',
  'out-of-area': 'Out-of-area contact',
  doctor: 'Doctor',
  vet: 'Vet',
  pharmacy: 'Pharmacy',
  utility: 'Utility',
  school: 'School',
  employer: 'Employer',
  'medical-supplier': 'Medical supplier',
};

/** Household contacts (§4.2 Contact, §7.1 item 7). */
export function Contacts() {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const save = useSession((s) => s.save);
  const remove = useSession((s) => s.remove);
  const [editing, setEditing] = useState<Contact | null>(null);
  if (!snapshot) return null;

  const blank = (): Contact => {
    const now = new Date().toISOString();
    return { id: newId(), householdId: snapshot.household.id, createdAt: now, updatedAt: now, name: '', phone: '', type: 'emergency', isOutOfArea: false };
  };
  const valid = !!editing?.name.trim() && /\d{7,}/.test((editing?.phone ?? '').replace(/\D/g, ''));

  return (
    <Screen header={<AppBar title="Contacts" back />}>
      <AppText variant="body" secondary>
        Aim for two emergency contacts, one out-of-area contact, and doctors, pharmacy and vet for anyone with medicines.
      </AppText>
      <Card padded={false}>
        {snapshot.contacts.map((c, i) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={`${c.name}, ${CONTACT_TYPE_LABEL[c.type]}, ${c.phone}. Edit`}
            onPress={() => setEditing(c)}
            style={[styles.row, { padding: t.space.md, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.colors.borderDefault }]}>
            {c.isOutOfArea ? <Globe size={22} color={t.colors.brandAccent} /> : null}
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="headline">{c.name}</AppText>
              <AppText variant="footnote" secondary>
                {CONTACT_TYPE_LABEL[c.type]} · {c.phone}
              </AppText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Call ${c.name}`} onPress={() => Linking.openURL(`tel:${c.phone.replace(/[^\d+]/g, '')}`).catch(() => {})} style={styles.call}>
              <Phone size={22} color={t.colors.brandPrimary} weight="bold" />
            </Pressable>
          </Pressable>
        ))}
        {snapshot.contacts.length === 0 ? (
          <View style={{ padding: t.space.md }}>
            <AppText variant="body" secondary>
              No contacts yet.
            </AppText>
          </View>
        ) : null}
      </Card>
      <Button label="Add contact" icon={Plus} onPress={() => setEditing(blank())} />

      <BottomSheet visible={!!editing} onClose={() => setEditing(null)} title={editing && snapshot.contacts.some((c) => c.id === editing.id) ? 'Edit contact' : 'Add contact'} height="full">
        {editing ? (
          <View style={{ gap: t.space.md }}>
            <TextField label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} autoCapitalize="words" />
            <TextField label="Phone" value={editing.phone} keyboardType="phone-pad" onChange={(v) => setEditing({ ...editing, phone: v })} />
            <TextField label="Relationship (optional)" value={editing.relationship ?? ''} onChange={(v) => setEditing({ ...editing, relationship: v })} />
            <ChipSelect
              label="Type"
              value={editing.type}
              onChange={(v) => setEditing({ ...editing, type: v, isOutOfArea: v === 'out-of-area' ? true : editing.isOutOfArea })}
              options={(Object.keys(CONTACT_TYPE_LABEL) as ContactType[]).map((k) => ({ value: k, label: CONTACT_TYPE_LABEL[k] }))}
            />
            <SwitchRow label="Lives out of the area" hint="Out-of-area contacts can relay messages when local lines are busy." value={editing.isOutOfArea} onChange={(v) => setEditing({ ...editing, isOutOfArea: v })} />
            <Button
              label="Save"
              disabled={!valid}
              onPress={async () => {
                await save('contacts', { ...editing, name: editing.name.trim() });
                setEditing(null);
              }}
            />
            {snapshot.contacts.some((c) => c.id === editing.id) ? (
              <Button
                label="Delete contact"
                variant="ghost"
                onPress={() =>
                  Alert.alert('Delete this contact?', undefined, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        await remove('contacts', editing.id);
                        setEditing(null);
                      },
                    },
                  ])
                }
              />
            ) : null}
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
  call: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
