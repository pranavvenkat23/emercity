import { useEffect, useState } from 'react';
import { Alert, Linking, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { ChipSelect, FormSection, SwitchRow } from '@/components/form';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { NOTE_CATEGORIES } from '@/domain/notification-prefs';
import { useNotificationPrefs } from '@/services/notification-prefs';
import { notificationsEnabled, notifyNow, requestNotificationPermission } from '@/services/notifications';
import { useTheme } from '@/theme/theme';

const START = ['20:00', '21:00', '22:00', '23:00'];
const END = ['06:00', '07:00', '08:00', '09:00'];
const label = (hhmm: string) => new Date(2000, 0, 1, Number(hhmm.slice(0, 2)), 0).toLocaleTimeString([], { hour: 'numeric' });

/** SET-03 Notifications (§22.2). */
export function NotificationSettings() {
  const t = useTheme();
  const { prefs, load, update } = useNotificationPrefs();
  const [osAllowed, setOsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    load();
    notificationsEnabled().then(setOsAllowed);
  }, [load]);

  const toggleCategory = (id: string, critical: boolean | undefined, v: boolean) => {
    const apply = () => update({ categories: { ...prefs.categories, [id]: v } });
    if (!v && critical) {
      Alert.alert('Turn off a safety notification?', 'You could miss a warning or a countdown while the app is closed.', [
        { text: 'Keep on', style: 'cancel' },
        { text: 'Turn off', style: 'destructive', onPress: apply },
      ]);
    } else apply();
  };

  return (
    <Screen header={<AppBar title="Notifications" back showAvatar={false} sheet />}>
      {osAllowed === false ? (
        <View style={{ gap: t.space.xs }}>
          <AppText variant="body">Notifications are off for Emercity in your phone settings.</AppText>
          <Button
            label="Turn on notifications"
            onPress={async () => {
              const ok = await requestNotificationPermission();
              setOsAllowed(ok);
              if (!ok) Linking.openSettings();
            }}
          />
        </View>
      ) : null}

      <FormSection>
        <SwitchRow label="Allow notifications" value={prefs.enabled} onChange={(v) => update({ enabled: v })} />
      </FormSection>

      {prefs.enabled ? (
        <>
          <FormSection title="Safety (on by default, ignore quiet hours)">
            {NOTE_CATEGORIES.filter((c) => c.critical).map((c) => (
              <SwitchRow key={c.id} label={c.label} hint={c.detail} value={prefs.categories[c.id] !== false} onChange={(v) => toggleCategory(c.id, true, v)} />
            ))}
          </FormSection>
          <FormSection title="Reminders">
            {NOTE_CATEGORIES.filter((c) => !c.critical).map((c) => (
              <SwitchRow key={c.id} label={c.label} hint={c.detail} value={prefs.categories[c.id] !== false} onChange={(v) => toggleCategory(c.id, false, v)} />
            ))}
          </FormSection>
          <FormSection title="Quiet hours">
            <SwitchRow
              label="Hold tips and reminders overnight"
              hint="Supplies, seasonal tips, drills, and card reminders wait until morning. Safety notifications always come through."
              value={!!prefs.quietHours}
              onChange={(v) => update({ quietHours: v ? { start: '21:00', end: '07:00' } : null })}
            />
            {prefs.quietHours ? (
              <>
                <ChipSelect label="From" value={prefs.quietHours.start} onChange={(v) => update({ quietHours: { ...prefs.quietHours!, start: v } })} options={START.map((s) => ({ value: s, label: label(s) }))} />
                <ChipSelect label="Until" value={prefs.quietHours.end} onChange={(v) => update({ quietHours: { ...prefs.quietHours!, end: v } })} options={END.map((s) => ({ value: s, label: label(s) }))} />
              </>
            ) : null}
          </FormSection>
        </>
      ) : null}

      <Button
        label="Send a test alert"
        variant="secondary"
        onPress={async () => {
          const ok = osAllowed || (await requestNotificationPermission());
          setOsAllowed(ok);
          if (!ok) return;
          await notifyNow({ title: 'Emercity test', body: 'This is a test. No action needed.', priority: 'normal', url: 'emercity://' });
        }}
      />
      <AppText variant="footnote" secondary>
        Emercity uses time-sensitive notifications for safety alerts. Breaking through Do Not Disturb needs Apple approval, which this app does not have yet. Alerts are checked while the app is open; on the free Firebase plan there is no background push.
      </AppText>
    </Screen>
  );
}
