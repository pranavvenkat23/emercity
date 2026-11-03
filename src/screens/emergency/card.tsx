import * as Brightness from 'expo-brightness';
import { router } from 'expo-router';
import { X } from 'phosphor-react-native';
import { useEffect } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { LockCard } from '@/components/lock-card';
import { useLockCard } from '@/hooks/use-lock-card';
import { useStatusBarStyle } from '@/hooks/use-status-bar';

/** Lock-screen card full-screen at max brightness, for responders (§14.5). */
export function EmergencyCard() {
  useStatusBarStyle('light');
  const { width, height } = useWindowDimensions();
  const { settings, content } = useLockCard();

  useEffect(() => {
    let previous: number | null = null;
    Brightness.getBrightnessAsync()
      .then((b) => {
        previous = b;
        return Brightness.setBrightnessAsync(1);
      })
      .catch(() => {});
    return () => {
      if (previous != null) Brightness.setBrightnessAsync(previous).catch(() => {});
    };
  }, []);

  if (!settings || !content) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <LockCard content={content} settings={{ ...settings, textSize: 'large' }} width={width} height={height} />
      <Pressable accessibilityRole="button" accessibilityLabel="Close card" onPress={() => router.back()} style={{ position: 'absolute', top: 54, right: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
        <X size={28} color="#FFFFFF" weight="bold" />
      </Pressable>
    </View>
  );
}
