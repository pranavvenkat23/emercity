import { router } from 'expo-router';
import { Barcode, MagnifyingGlass, PencilSimple } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useHouseholdPaths } from '@/hooks/use-household-paths';
import { searchProducts, type DrugProduct } from '@/services/openfda';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/** Encodes a chosen product for the medication form. */
export function productParams(p: DrugProduct, ownerId?: string): { id: string; [key: string]: string } {
  return {
    id: 'new',
    ownerId: ownerId ?? '',
    brandName: p.brandName,
    genericName: p.genericName,
    strength: p.strength,
    dosageForm: p.dosageForm,
    route: p.route,
    ndc: p.productNdc,
    critical: p.criticalClass ? '1' : '0',
    source: p.source,
  };
}

/** HH-06 Add medication (§7.6): scan, search, or type. */
export function AddMedication({ ownerId }: { ownerId?: string }) {
  const paths = useHouseholdPaths();
  const t = useTheme();
  const online = useSession((s) => s.online);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<DrugProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    let alive = true;
    setLoading(true);
    const id = setTimeout(() => {
      searchProducts(q)
        .then((r) => alive && (setResults(r), setError(null)))
        .catch(() => alive && setError('Search is unavailable right now. You can add it manually.'))
        .finally(() => alive && setLoading(false));
    }, 350);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [q]);

  return (
    <Screen header={<AppBar title="Add medication" back showAvatar={false} />}>
      <View style={{ flexDirection: 'row', gap: t.space.sm }}>
        <Card onPress={() => router.push(paths.scan(ownerId))} accessibilityLabel="Scan barcode" style={{ flex: 1, alignItems: 'center', gap: 8, minHeight: 120, justifyContent: 'center' }}>
          <Barcode size={36} color={t.colors.brandPrimary} weight="bold" />
          <AppText variant="headline">Scan barcode</AppText>
        </Card>
        <Card onPress={() => router.push(paths.medication({ id: 'new', ownerId: ownerId ?? '' }))} accessibilityLabel="Add it manually" style={{ flex: 1, alignItems: 'center', gap: 8, minHeight: 120, justifyContent: 'center' }}>
          <PencilSimple size={36} color={t.colors.brandPrimary} weight="bold" />
          <AppText variant="headline">Type it</AppText>
        </Card>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: t.colors.borderDefault, borderRadius: t.radius.button, backgroundColor: t.colors.surfaceCard, paddingHorizontal: 12, minHeight: 52 }}>
        <MagnifyingGlass size={20} color={t.colors.textSecondary} />
        <TextInput
          accessibilityLabel="Search medicines"
          value={q}
          onChangeText={setQ}
          placeholder="Search by brand or generic name"
          placeholderTextColor={t.colors.textSecondary}
          autoCorrect={false}
          autoCapitalize="none"
          style={{ flex: 1, color: t.colors.textPrimary, fontSize: t.type.body.fontSize }}
        />
        {loading ? <ActivityIndicator /> : null}
      </View>
      {online === false ? (
        <AppText variant="footnote" secondary>
          Offline: searching only the medicines saved on this phone.
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="callout" color={t.colors.severityUrgent}>
          {error}
        </AppText>
      ) : null}

      {results.map((p) => (
        <Pressable
          key={`${p.productNdc}-${p.strength}`}
          accessibilityRole="button"
          accessibilityLabel={`${p.brandName}, ${p.genericName}, ${p.strength}, ${p.dosageForm}`}
          onPress={() => router.push(paths.medication(productParams(p, ownerId)))}
          style={({ pressed }) => ({ paddingVertical: 12, borderBottomWidth: 1, borderColor: t.colors.borderDefault, backgroundColor: pressed ? t.colors.surfaceSunken : 'transparent' })}>
          <AppText variant="headline">{p.brandName}</AppText>
          <AppText variant="footnote" secondary>
            {[p.genericName, p.strength, p.dosageForm, p.labeler].filter(Boolean).join(' · ')}
          </AppText>
        </Pressable>
      ))}
      {q.trim().length >= 2 && !loading && results.length === 0 && !error ? (
        <View style={{ gap: t.space.xs }}>
          <AppText variant="body" secondary>
            No matches for “{q}”.
          </AppText>
          <Button label="Add it manually" variant="secondary" onPress={() => router.push(paths.medication({ id: 'new', ownerId: ownerId ?? '', brandName: q }))} />
        </View>
      ) : null}
      <AppText variant="footnote" secondary>
        Product details come from the FDA National Drug Code Directory. FDA doesn't verify each listing, so check that the name matches your box.
      </AppText>
    </Screen>
  );
}
