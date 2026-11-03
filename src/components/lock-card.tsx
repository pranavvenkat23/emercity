import { forwardRef } from 'react';
import { Text, View, type HostInstance, type ViewStyle } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import type { CardBlock, CardContent, CardSettings } from '@/domain/lock-card';

const THEMES = {
  dark: { bg: '#0E1116', fg: '#F2F4F7', muted: '#A9B2BF', critical: '#FF4D5E', qrBg: '#FFFFFF', qrFg: '#0E1116' },
  light: { bg: '#F7F8FA', fg: '#14181F', muted: '#5B6573', critical: '#C8102E', qrBg: '#FFFFFF', qrFg: '#14181F' },
  contrast: { bg: '#000000', fg: '#FFD60A', muted: '#FFFFFF', critical: '#FF4D5E', qrBg: '#FFFFFF', qrFg: '#000000' },
} as const;

/**
 * The lock-screen wallpaper (§14.4). Laid out in points at `width`; the
 * builder captures it at the device's pixel ratio for native resolution.
 * Safe zones: nothing in the top 30% (clock) or bottom 12% (shortcuts).
 * Text never smaller than 16 pt at full size; phone numbers 20 pt bold.
 */
export const LockCard = forwardRef<HostInstance, { content: CardContent; settings: CardSettings; width: number; height: number; style?: ViewStyle; showSafeZones?: boolean }>(
  function LockCard({ content, settings, width, height, style, showSafeZones }, ref) {
    const th = THEMES[settings.theme];
    const k = width / 393; // scale relative to a 393-pt-wide phone
    const big = settings.textSize === 'large' ? 1.2 : 1;
    const fs = (n: number) => Math.round(n * k * big);
    // §14.4: at least 25 mm wide on screen ≈ 150 pt on current iPhones.
    const qrSize = Math.round(150 * k);

    const block = (b: CardBlock) => {
      if (!settings.blocks[b]) return null;
      switch (b) {
        case 'header':
          return (
            <View key={b} style={{ gap: 2 }}>
              <Text style={{ color: th.critical, fontSize: fs(16), fontWeight: '800', letterSpacing: 1 }}>IN CASE OF EMERGENCY</Text>
              <Text style={{ color: th.fg, fontSize: fs(18), fontWeight: '700' }}>{content.household}</Text>
            </View>
          );
        case 'meeting':
          return content.meeting.length ? (
            <View key={b}>
              <Text style={{ color: th.muted, fontSize: fs(14) }}>Meet at</Text>
              <Text style={{ color: th.fg, fontSize: fs(17), fontWeight: '600' }}>{content.meeting.join('  ·  ')}</Text>
            </View>
          ) : null;
        case 'contacts':
          return content.contacts.length ? (
            <View key={b} style={{ gap: 2 }}>
              {content.contacts.map((c) => (
                <Text key={c.phone} style={{ color: th.fg, fontSize: fs(16) }}>
                  {c.name}
                  {c.outOfArea ? ' (out of area)' : ''}  <Text style={{ fontSize: fs(20), fontWeight: '800' }}>{c.phone}</Text>
                </Text>
              ))}
            </View>
          ) : null;
        case 'critical':
          return content.critical.length ? (
            <View key={b} style={{ borderLeftWidth: 5 * k, borderLeftColor: th.critical, paddingLeft: 10 * k, gap: 2 }}>
              <Text style={{ color: th.critical, fontSize: fs(14), fontWeight: '800' }}>CRITICAL NEEDS</Text>
              {content.critical.map((l) => (
                <Text key={l.memberId} style={{ color: th.fg, fontSize: fs(16), fontWeight: '600' }}>
                  {l.text}
                </Text>
              ))}
              {content.moreCritical ? <Text style={{ color: th.muted, fontSize: fs(14) }}>+{content.moreCritical} more in the app</Text> : null}
            </View>
          ) : null;
        case 'myMedical':
          return content.myMedical.length ? (
            <View key={b}>
              <Text style={{ color: th.muted, fontSize: fs(14) }}>My medical info</Text>
              <Text style={{ color: th.fg, fontSize: fs(16) }}>{content.myMedical.join(' · ')}</Text>
            </View>
          ) : null;
        case 'pets':
          return content.pets.length ? (
            <Text key={b} style={{ color: th.fg, fontSize: fs(16) }}>
              {content.pets.join(' · ')}
            </Text>
          ) : null;
        case 'address':
          return content.address ? (
            <Text key={b} style={{ color: th.fg, fontSize: fs(16) }}>
              {content.address}
            </Text>
          ) : null;
        case 'qr':
          return (
            <View key={b} style={{ alignSelf: 'flex-start', padding: 6 * k, backgroundColor: th.qrBg, borderRadius: 6 * k }}>
              <QRCode value={content.qrText} size={qrSize} backgroundColor={th.qrBg} color={th.qrFg} ecl="M" />
            </View>
          );
      }
    };

    return (
      <View ref={ref} collapsable={false} style={[{ width, height, backgroundColor: th.bg, overflow: 'hidden' }, style]}>
        <View style={{ position: 'absolute', top: height * 0.3, bottom: height * 0.12, left: 22 * k, right: 22 * k, gap: 12 * k, justifyContent: 'center' }}>
          {settings.order.map(block)}
        </View>
        {showSafeZones ? (
          <>
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.3, backgroundColor: 'rgba(128,128,128,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: th.muted, fontSize: fs(44), fontWeight: '300' }}>9:41</Text>
            </View>
            <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.12, backgroundColor: 'rgba(128,128,128,0.18)' }} />
          </>
        ) : null}
      </View>
    );
  },
);
