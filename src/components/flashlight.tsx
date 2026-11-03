import { CameraView, useCameraPermissions } from 'expo-camera';
import { Flashlight as FlashIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { useA11y } from '@/stores/a11y-store';
import { useTheme } from '@/theme/theme';

import { AppText } from './text';

/**
 * Flashlight quick tool (§12.3 item 9). The phone torch is controlled
 * through a tiny hidden camera view, so it needs camera permission.
 */
export function FlashlightTool() {
  const t = useTheme();
  const [on, setOn] = useState(false);
  const [perm, request] = useCameraPermissions();

  const toggle = async () => {
    if (!on && !perm?.granted) {
      const r = await request();
      if (!r.granted) {
        Alert.alert('Camera access is off', 'The flashlight needs camera access. You can turn it on in Settings.');
        return;
      }
    }
    setOn((v) => !v);
  };

  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel="Flashlight" onPress={toggle} style={{ alignItems: 'center', gap: 4, minWidth: 72, minHeight: 72, justifyContent: 'center' }}>
      <FlashIcon size={30} color={on ? t.colors.severityImportant : t.colors.textPrimary} weight={on ? 'fill' : 'bold'} />
      <AppText variant="caption">{on ? 'Light on' : 'Flashlight'}</AppText>
      {on && perm?.granted ? (
        <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} pointerEvents="none">
          <CameraView style={{ width: 1, height: 1 }} enableTorch facing="back" />
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Blinks the torch three times when `trigger` turns true, if the user
 * turned on "Flash the light on critical events" (§20.2, opt-in) and
 * camera access is already granted. Never asks for permission itself.
 */
export function CriticalFlash({ trigger }: { trigger: boolean }) {
  const enabled = useA11y((s) => s.flashOnCritical);
  const [perm] = useCameraPermissions();
  const [lit, setLit] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (!trigger || !enabled || !perm?.granted || done.current) return;
    done.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < 6; i++) timers.push(setTimeout(() => setLit(i % 2 === 0), i * 300));
    timers.push(setTimeout(() => setLit(false), 6 * 300));
    return () => timers.forEach(clearTimeout);
  }, [trigger, enabled, perm?.granted]);

  if (!lit) return null;
  return (
    <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} pointerEvents="none">
      <CameraView style={{ width: 1, height: 1 }} enableTorch facing="back" />
    </View>
  );
}
