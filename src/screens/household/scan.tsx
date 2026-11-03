import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { Flashlight, Keyboard, X } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { AppText } from '@/components/text';
import { ndcFromBarcode, normalizeManualNdc } from '@/domain/ndc';
import { useStatusBarStyle } from '@/hooks/use-status-bar';
import { useHouseholdPaths } from '@/hooks/use-household-paths';
import { haptic } from '@/services/haptics';
import { candidatesFor, lookupNdc, type DrugProduct } from '@/services/openfda';
import { useTheme } from '@/theme/theme';

import { productParams } from './add-medication';

type Phase = { kind: 'scanning' } | { kind: 'looking' } | { kind: 'message'; text: string; action?: 'type' | 'pending'; barcode?: string } | { kind: 'choose'; products: DrugProduct[]; expiration?: string | null };

/** HH-07 Scan barcode (§13.1–13.3, §13.6). */
export function ScanMedication({ ownerId }: { ownerId?: string }) {
  const paths = useHouseholdPaths();
  const t = useTheme();
  useStatusBarStyle('light');
  const insets = useSafeAreaInsets();
  const [perm, requestPerm] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'scanning' });
  const [hint, setHint] = useState(false);
  const [manual, setManual] = useState(false);
  const [ndcText, setNdcText] = useState('');
  const busy = useRef(false);

  useEffect(() => {
    if (perm && !perm.granted && perm.canAskAgain) requestPerm();
  }, [perm, requestPerm]);

  useEffect(() => {
    const id = setTimeout(() => setHint(true), 5000);
    return () => clearTimeout(id);
  }, []);

  const resolve = async (candidates: string[], extras: { expiration?: string | null; barcode?: string } = {}) => {
    setPhase({ kind: 'looking' });
    try {
      const r = await lookupNdc(candidates);
      if (r.status === 'found' && r.products.length === 1) {
        router.replace(paths.medication({ ...productParams(r.products[0], ownerId), expiration: extras.expiration ?? '' }));
      } else if (r.status === 'found') {
        setPhase({ kind: 'choose', products: r.products, expiration: extras.expiration });
      } else if (r.status === 'offline') {
        setPhase({ kind: 'message', text: "No connection. We'll save the barcode and look it up when you're online.", action: 'pending', barcode: extras.barcode });
      } else {
        setPhase({ kind: 'message', text: "We couldn't find this medicine in the FDA directory.", action: 'type' });
      }
    } catch {
      setPhase({ kind: 'message', text: 'The FDA directory is unavailable right now.', action: 'type' });
    }
  };

  const onScan = async (res: BarcodeScanningResult) => {
    if (busy.current || phase.kind !== 'scanning') return;
    busy.current = true;
    haptic.tap();
    const parsed = ndcFromBarcode(res.type, res.data);
    if (!parsed.ndc10) {
      setPhase({
        kind: 'message',
        text: parsed.reason === 'pharmacy-label' ? 'This looks like a pharmacy barcode. Scan the manufacturer’s box, or type the medicine name.' : "That barcode doesn't contain a drug code. Try the barcode on the outer box.",
        action: 'type',
      });
      busy.current = false;
      return;
    }
    await resolve(candidatesFor(parsed.ndc10), { expiration: parsed.expiration, barcode: parsed.ndc10 });
    busy.current = false;
  };

  if (perm && !perm.granted) {
    return (
      <View style={[styles.full, { backgroundColor: '#000', padding: t.space.lg, paddingTop: insets.top + 24, gap: t.space.md }]}>
        <AppText variant="title2" color="#FFFFFF">
          Camera access is off.
        </AppText>
        <AppText variant="body" color="#FFFFFF">
          You can still type the medicine name or its NDC number.
        </AppText>
        <Button label="Open Settings" variant="inverse" onPress={() => Linking.openSettings()} />
        <Button label="Type it instead" variant="inverse" onPress={() => router.replace(paths.addMedication(ownerId))} />
        <Button label="Enter NDC number" variant="inverse" onPress={() => setManual(true)} />
        <ManualNdc visible={manual} value={ndcText} onChange={setNdcText} onClose={() => setManual(false)} onSubmit={(c) => (setManual(false), resolve(c))} />
      </View>
    );
  }

  return (
    <View style={[styles.full, { backgroundColor: '#000' }]}>
      {perm?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['upc_a', 'ean13', 'datamatrix', 'code128'] }}
          onBarcodeScanned={phase.kind === 'scanning' ? onScan : undefined}
        />
      ) : null}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={styles.iconBtn}>
          <X size={28} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={torch ? 'Turn torch off' : 'Turn torch on'} onPress={() => setTorch((v) => !v)} style={styles.iconBtn}>
          <Flashlight size={28} color={torch ? '#FFD60A' : '#FFFFFF'} weight={torch ? 'fill' : 'bold'} />
        </Pressable>
      </View>
      <View style={styles.center} pointerEvents="none">
        <View style={[styles.guide, { borderColor: phase.kind === 'looking' ? t.colors.statusSafe : '#FFFFFF' }]} />
        <AppText variant="headline" color="#FFFFFF" align="center" style={{ marginTop: 16 }}>
          Line up the barcode on the box
        </AppText>
        {hint ? (
          <AppText variant="subhead" color="#FFFFFF" align="center" style={{ marginTop: 8, maxWidth: 300 }}>
            Try the barcode on the outer box, not the pharmacy sticker.
          </AppText>
        ) : null}
        {phase.kind === 'looking' ? <ActivityIndicator color="#FFFFFF" style={{ marginTop: 16 }} /> : null}
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Button label="Type it instead" variant="inverse" onPress={() => router.replace(paths.addMedication(ownerId))} />
        <Button label="Enter NDC number" icon={Keyboard} variant="inverse" onPress={() => setManual(true)} />
      </View>

      <ManualNdc visible={manual} value={ndcText} onChange={setNdcText} onClose={() => setManual(false)} onSubmit={(c) => (setManual(false), resolve(c))} />

      <BottomSheet visible={phase.kind === 'message'} onClose={() => setPhase({ kind: 'scanning' })} title="Scan result">
        {phase.kind === 'message' ? (
          <View style={{ gap: t.space.md }}>
            <AppText variant="body">{phase.text}</AppText>
            {phase.action === 'pending' ? (
              <Button
                label="Save as pending lookup"
                onPress={() => router.replace(paths.medication({ id: 'new', ownerId: ownerId ?? '', brandName: 'Pending lookup', pendingBarcode: phase.barcode ?? '' }))}
              />
            ) : null}
            <Button label="Type it instead" variant="secondary" onPress={() => router.replace(paths.addMedication(ownerId))} />
            <Button label="Scan again" variant="ghost" onPress={() => setPhase({ kind: 'scanning' })} />
          </View>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={phase.kind === 'choose'} onClose={() => setPhase({ kind: 'scanning' })} title="Which one is it?" height="full">
        {phase.kind === 'choose'
          ? phase.products.map((p) => (
              <Pressable
                key={p.productNdc}
                accessibilityRole="button"
                onPress={() => router.replace(paths.medication({ ...productParams(p, ownerId), expiration: phase.expiration ?? '' }))}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: t.colors.borderDefault }}>
                <AppText variant="headline">{p.brandName}</AppText>
                <AppText variant="footnote" secondary>
                  {[p.genericName, p.strength, p.dosageForm, p.labeler, `NDC ${p.productNdc}`, p.discontinued ? 'No longer listed' : null].filter(Boolean).join(' · ')}
                </AppText>
              </Pressable>
            ))
          : null}
      </BottomSheet>
    </View>
  );
}

function ManualNdc({ visible, value, onChange, onClose, onSubmit }: { visible: boolean; value: string; onChange: (v: string) => void; onClose: () => void; onSubmit: (candidates: string[]) => void }) {
  const t = useTheme();
  const candidates = normalizeManualNdc(value);
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Enter NDC number">
      <View style={{ gap: t.space.md }}>
        <AppText variant="body" secondary>
          10 or 11 digits, with or without dashes, for example 0002-7510-01.
        </AppText>
        <TextInput
          accessibilityLabel="NDC number"
          value={value}
          onChangeText={onChange}
          keyboardType="numbers-and-punctuation"
          autoFocus
          style={{ minHeight: 52, borderWidth: 1, borderColor: t.colors.borderDefault, borderRadius: t.radius.button, paddingHorizontal: 12, fontSize: 20, color: t.colors.textPrimary, backgroundColor: t.colors.surfaceCard, fontVariant: ['tabular-nums'] }}
        />
        {value && !candidates.length ? (
          <AppText variant="footnote" color={t.colors.severityUrgent}>
            That doesn't look like an NDC yet.
          </AppText>
        ) : null}
        <Button label="Look it up" disabled={!candidates.length} onPress={() => onSubmit(candidates)} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  iconBtn: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  guide: { width: 280, height: 160, borderRadius: 20, borderWidth: 3 },
  bottom: { position: 'absolute', bottom: 0, left: 16, right: 16, gap: 10 },
});
