import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { ChipSelect, FormSection, SwitchRow } from '@/components/form';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useA11y, type A11yPrefs } from '@/stores/a11y-store';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/** SET-05 Accessibility (§20.2–20.3). */
export function AccessibilitySettings() {
  const t = useTheme();
  const db = useSession((s) => s.db);
  const prefs = useA11y();
  if (!db) return null;
  const set = (patch: Partial<A11yPrefs>) => prefs.update(db.kv, patch);

  return (
    <Screen header={<AppBar title="Accessibility" back showAvatar={false} sheet />}>
      <FormSection title="Simple Mode">
        <SwitchRow
          label="Simple Mode"
          hint="Home shows three big buttons: I need help, Emergency steps, My card. The plan can’t be changed on this phone while it’s on."
          value={prefs.simpleMode}
          onChange={(v) => {
            set({ simpleMode: v });
            if (v) router.dismissTo('/(tabs)/(home)');
          }}
        />
      </FormSection>
      <FormSection title="Seeing">
        <SwitchRow label="High Contrast" hint="Yellow and white on black." value={prefs.highContrast} onChange={(v) => set({ highContrast: v })} />
        <ChipSelect<string>
          label="Text size"
          value={String(prefs.textScale)}
          onChange={(v) => set({ textScale: Number(v) as A11yPrefs['textScale'] })}
          options={[
            { value: '1', label: 'Standard' },
            { value: '1.15', label: 'Larger' },
            { value: '1.3', label: 'Largest' },
          ]}
        />
        <AppText variant="footnote" secondary>
          This adds to your phone’s own text size setting.
        </AppText>
      </FormSection>
      <FormSection title="Motion, sound and touch">
        <SwitchRow label="Reduce motion" hint="On here, or follow the phone’s setting." value={prefs.reduceMotion === 'on'} onChange={(v) => set({ reduceMotion: v ? 'on' : 'system' })} />
        <SwitchRow label="Vibration" hint="For critical items and finished steps." value={prefs.haptics} onChange={(v) => set({ haptics: v })} />
        <ChipSelect<string>
          label="Read-aloud speed"
          value={String(prefs.speechRate)}
          onChange={(v) => set({ speechRate: Number(v) as A11yPrefs['speechRate'] })}
          options={[
            { value: '0.8', label: 'Slower' },
            { value: '1', label: 'Normal' },
            { value: '1.2', label: 'Faster' },
          ]}
        />
        <SwitchRow
          label="Flash the light on critical events"
          hint="In Emergency Mode, blinks the flashlight when something critical appears. Uses the camera light."
          value={prefs.flashOnCritical}
          onChange={(v) => {
            set({ flashOnCritical: v });
            if (v) Alert.alert('Camera access needed', 'The light blinks only if camera access is allowed. Turn on the flashlight once in Emergency Mode to allow it.');
          }}
        />
      </FormSection>
      <View style={{ gap: t.space.xs }}>
        <AppText variant="footnote" secondary>
          Emercity follows your phone’s VoiceOver and text size settings. Every alert sound also shows on screen and vibrates.
        </AppText>
      </View>
    </Screen>
  );
}
