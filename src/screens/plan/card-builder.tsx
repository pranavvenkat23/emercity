import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ArrowDown, ArrowUp, DownloadSimple, Printer, ShareNetwork } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { Alert, PixelRatio, Pressable, Switch, useWindowDimensions, View, type HostInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { AppBar } from '@/components/app-bar';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { ChipSelect, FormSection } from '@/components/form';
import { LockCard } from '@/components/lock-card';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { BLOCK_LABEL, type CardBlock } from '@/domain/lock-card';
import { displayName } from '@/domain/members';
import { useLockCard } from '@/hooks/use-lock-card';
import { useMe } from '@/hooks/use-me';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/** PLAN-09 Lock-screen card builder (§14.3). */
export function CardBuilder() {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const snapshot = useSession((s) => s.snapshot);
  const { me } = useMe();
  const [ownerId, setOwnerId] = useState<string | undefined>(me?.id);
  const { settings, content, update, markSaved, outOfDate } = useLockCard(ownerId);
  const captureView = useRef<HostInstance>(null);
  const [howTo, setHowTo] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!snapshot || !settings || !content) return null;

  const previewW = Math.min(width * 0.62, 280);
  const previewH = previewW * (height / width);
  const owners = snapshot.members.filter((m) => m.role === 'adult' || m.role === 'older-adult' || m.role === 'teen');

  const capture = async () => {
    // Render at the device's native resolution (§14.4).
    return captureRef(captureView, { format: 'png', quality: 1, width: Math.round(width * PixelRatio.get()), height: Math.round(height * PixelRatio.get()) });
  };

  const save = async () => {
    setBusy(true);
    try {
      const perm = await requestPermissionsAsync(true);
      if (!perm.granted) {
        Alert.alert('Photos access is off', 'Allow Emercity to add photos in Settings to save your card.');
        return;
      }
      const uri = await capture();
      await Asset.create(uri);
      await markSaved();
      setHowTo(true);
    } catch {
      Alert.alert('Could not save the card', 'Try again, or use Share.');
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const uri = await capture();
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share emergency card' });
  };

  const print = async () => {
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
    const html = `<html><body style="font-family:-apple-system,Helvetica;margin:0"><div style="width:3.375in;height:2.125in;border:1px solid #000;border-radius:8px;padding:8px;box-sizing:border-box;font-size:8pt">
      <div style="color:#C8102E;font-weight:800">IN CASE OF EMERGENCY · ${esc(content.household)}</div>
      ${content.meeting.length ? `<div><b>Meet:</b> ${esc(content.meeting.join(' / '))}</div>` : ''}
      ${content.contacts.map((c) => `<div>${esc(c.name)}${c.outOfArea ? ' (out of area)' : ''}: <b>${esc(c.phone)}</b></div>`).join('')}
      ${content.critical.length ? `<div style="border-left:3px solid #C8102E;padding-left:4px;margin-top:2px"><b>Critical:</b> ${esc(content.critical.map((l) => l.text).join('; '))}</div>` : ''}
      </div></body></html>`;
    await Print.printAsync({ html });
  };

  const move = (b: CardBlock, dir: -1 | 1) => {
    const order = [...settings.order];
    const i = order.indexOf(b);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    update({ order });
  };

  return (
    <Screen header={<AppBar title="Lock-screen card" back />}>
      {outOfDate ? (
        <AppText variant="callout" color={t.colors.severityImportant}>
          Your saved card is out of date. Save it again and set it as your lock screen.
        </AppText>
      ) : null}
      <View style={{ alignItems: 'center' }}>
        <View style={{ borderRadius: 28, overflow: 'hidden', borderWidth: 6, borderColor: '#111' }} accessible accessibilityLabel={`Card preview. ${content.qrText}`}>
          <LockCard content={content} settings={settings} width={previewW} height={previewH} showSafeZones />
        </View>
        <AppText variant="footnote" secondary style={{ marginTop: 6 }}>
          Shaded areas: where the clock and shortcuts sit.
        </AppText>
      </View>

      {/* Full-size copy captured for the image (off-screen). */}
      <View style={{ position: 'absolute', left: -10000, top: 0 }} pointerEvents="none">
        <LockCard ref={captureView} content={content} settings={settings} width={width} height={height} />
      </View>

      <Button label="Save to Photos" icon={DownloadSimple} size="emergency" loading={busy} onPress={save} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="Share" icon={ShareNetwork} variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={share} />
        <Button label="Print" icon={Printer} variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={print} />
      </View>

      <FormSection title="Whose card">
        <ChipSelect label="Card for" value={settings.ownerId} onChange={(v) => setOwnerId(v)} options={owners.map((m) => ({ value: m.id, label: displayName(m) }))} />
      </FormSection>

      <FormSection title="What's on it">
        {settings.order.map((b, i) => (
          <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52 }}>
            <AppText variant="body" style={{ flex: 1 }}>
              {BLOCK_LABEL[b]}
              {b === 'myMedical' || b === 'address' ? ' (private)' : ''}
            </AppText>
            <Pressable accessibilityRole="button" accessibilityLabel={`Move ${BLOCK_LABEL[b]} up`} disabled={i === 0} onPress={() => move(b, -1)} style={{ padding: 10, opacity: i === 0 ? 0.3 : 1 }}>
              <ArrowUp size={20} color={t.colors.textPrimary} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Move ${BLOCK_LABEL[b]} down`} disabled={i === settings.order.length - 1} onPress={() => move(b, 1)} style={{ padding: 10, opacity: i === settings.order.length - 1 ? 0.3 : 1 }}>
              <ArrowDown size={20} color={t.colors.textPrimary} />
            </Pressable>
            <Switch
              accessibilityLabel={`Show ${BLOCK_LABEL[b]}`}
              value={settings.blocks[b]}
              onValueChange={(v) => update({ blocks: { ...settings.blocks, [b]: v } })}
              trackColor={{ true: t.colors.brandAccent, false: t.colors.borderDefault }}
            />
          </View>
        ))}
      </FormSection>

      <FormSection title="Style">
        <ChipSelect
          label="Theme"
          value={settings.theme}
          onChange={(v) => update({ theme: v })}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
            { value: 'contrast', label: 'High contrast' },
          ]}
        />
        <ChipSelect
          label="Text size"
          value={settings.textSize}
          onChange={(v) => update({ textSize: v })}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'large', label: 'Large' },
          ]}
        />
      </FormSection>

      <BottomSheet visible={howTo} onClose={() => setHowTo(false)} title="Saved to Photos">
        <AppText variant="body">To set it as your lock screen on iPhone:</AppText>
        <AppText variant="body">1. Open Photos and tap the card.</AppText>
        <AppText variant="body">2. Tap Share, then “Use as Wallpaper”.</AppText>
        <AppText variant="body">3. Choose “Set as Lock Screen”.</AppText>
        <AppText variant="footnote" secondary>
          On Android: long-press your lock screen or open Settings, then Wallpaper, and choose this image. Apps can’t set wallpapers automatically on iPhone, so you always confirm it.
        </AppText>
      </BottomSheet>
    </Screen>
  );
}
