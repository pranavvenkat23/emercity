import { Phone } from 'phosphor-react-native';
import { useState } from 'react';
import { Linking, Pressable } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { AppText } from '@/components/text';
import { useTheme } from '@/theme/theme';

/**
 * Always-visible Call 911 bar (§12.2, §12.3) with the "Call 911?"
 * confirmation sheet. Never auto-dials.
 */
export function Call911Bar({ variant = 'bar' }: { variant?: 'bar' | 'thin' }) {
  const t = useTheme();
  const [confirm, setConfirm] = useState(false);
  const [failed, setFailed] = useState(false);

  const dial = async () => {
    try {
      await Linking.openURL('tel:911');
      setConfirm(false);
    } catch {
      setFailed(true);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Call 911"
        accessibilityHint="Asks you to confirm before calling"
        onPress={() => {
          setFailed(false);
          setConfirm(true);
        }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          minHeight: variant === 'thin' ? 48 : t.touch.emergencyPrimary,
          backgroundColor: t.colors.severityCritical,
          borderRadius: variant === 'thin' ? 0 : t.radius.button,
          opacity: pressed ? 0.85 : 1,
        })}>
        <Phone size={24} color={t.colors.onCritical} weight="fill" />
        <AppText variant="headline" weight="700" color={t.colors.onCritical}>
          Call 911
        </AppText>
      </Pressable>
      <BottomSheet visible={confirm} onClose={() => setConfirm(false)} title="Call 911?">
        {failed ? (
          <AppText variant="body" color={t.colors.severityCritical}>
            This device can&apos;t place calls. Use any phone to dial 911.
          </AppText>
        ) : null}
        <Button label="Call 911" variant="critical" size="emergency" icon={Phone} onPress={dial} />
        <Button label="Cancel" variant="ghost" onPress={() => setConfirm(false)} />
      </BottomSheet>
    </>
  );
}
