import { router } from 'expo-router';
import { Crosshair, MagnifyingGlass, MapPin } from 'phosphor-react-native';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ChipSelect, FormSection, Stepper, SwitchRow, TextField } from '@/components/form';
import { SetupFrame } from '@/components/setup-frame';
import { AppText } from '@/components/text';
import { newId } from '@/data/ids';
import { isLoudoun, newHousehold, type HomeAnswers } from '@/domain/onboarding';
import type { Address, HeatingType, HomeType } from '@/models/types';
import { addressFromCurrentLocation, searchAddress } from '@/services/geocode';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

const HOME_TYPES: { value: HomeType; label: string }[] = [
  { value: 'single-family', label: 'House' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'apartment-low', label: 'Apartment (floors 1–3)' },
  { value: 'apartment-high', label: 'Apartment (floor 4+)' },
  { value: 'mobile-manufactured', label: 'Mobile/manufactured home' },
];
const HEATING: { value: HeatingType; label: string }[] = [
  { value: 'electric', label: 'Electric' },
  { value: 'gas', label: 'Gas' },
  { value: 'oil', label: 'Oil' },
  { value: 'heat-pump', label: 'Heat pump' },
  { value: 'wood', label: 'Wood' },
  { value: 'other', label: 'Other' },
];

/** ONB-04 Address and home (§5.4). */
export function AddressStep() {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const user = useSession((s) => s.user);
  const online = useSession((s) => s.online);
  const createHousehold = useSession((s) => s.createHousehold);
  const save = useSession((s) => s.save);
  const existing = snapshot && !snapshot.household.isDemo ? snapshot.household : null;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Address[] | null>(null);
  const [address, setAddress] = useState<Address | null>(existing?.address ?? null);
  const [busy, setBusy] = useState<'search' | 'gps' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [home, setHome] = useState<HomeAnswers>({
    homeType: existing?.homeType ?? 'single-family',
    floorLevel: existing?.floorLevel ?? 4,
    hasBasement: existing?.hasBasement ?? false,
    heatingType: existing?.heatingType ?? 'gas',
    hasGenerator: existing?.hasGenerator ?? false,
    generatorWatts: existing?.generatorWatts ?? null,
    hasBatteryBackup: existing?.hasBatteryBackup ?? false,
  });
  const set = (p: Partial<HomeAnswers>) => setHome({ ...home, ...p });
  const apartment = home.homeType === 'apartment-low' || home.homeType === 'apartment-high';

  const find = async () => {
    setBusy('search');
    setError(null);
    try {
      const r = await searchAddress(query);
      setResults(r);
      if (r.length === 1) setAddress(r[0]);
      if (!r.length) setError('No match. Check the street, city and ZIP, or use your current location.');
    } catch {
      setError(online === false ? 'Finding an address needs a connection. Use your current location instead.' : 'The address service didn’t answer. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const useGps = async () => {
    setBusy('gps');
    setError(null);
    try {
      const a = await addressFromCurrentLocation();
      if (a === 'denied') Alert.alert('Location is off', 'Type your address instead.');
      else setAddress(a);
    } catch {
      setError('Couldn’t get your location. Type your address instead.');
    } finally {
      setBusy(null);
    }
  };

  const next = async () => {
    if (!address) return;
    setBusy('save');
    try {
      if (existing) {
        await save('households', { ...existing, address, ...home, floorLevel: apartment ? home.floorLevel : null, generatorWatts: home.hasGenerator ? home.generatorWatts : null });
      } else {
        await createHousehold(newHousehold(address, home, { id: newId(), ownerUserId: user?.uid ?? null }, new Date()));
      }
      router.push('/people');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SetupFrame stage="Home" title="Your home" subtitle="Your address finds flood zones, nearby creeks and alerts for your street." primary={{ label: 'Next: who lives here', onPress: next, disabled: !address, loading: busy === 'save' }}>
      <FormSection>
        <TextField label="Home address" placeholder="Street, city, state, ZIP" value={query} onChange={setQuery} />
        <Button label="Find" icon={MagnifyingGlass} variant="secondary" disabled={query.trim().length < 6} loading={busy === 'search'} onPress={find} />
        <Button label="Use my current location" icon={Crosshair} variant="ghost" loading={busy === 'gps'} onPress={useGps} />
        {error ? (
          <AppText variant="callout" color={t.colors.severityCritical} accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
      </FormSection>

      {results && results.length > 1 && !address ? (
        <View style={{ gap: t.space.xs }}>
          <AppText variant="subhead">Pick your address</AppText>
          {results.map((r) => (
            <Card key={`${r.lat},${r.lng}`} onPress={() => setAddress(r)} accessibilityLabel={`${r.line1}, ${r.city}`}>
              <AppText variant="body">
                {r.line1}, {r.city}, {r.state} {r.zip}
              </AppText>
            </Card>
          ))}
        </View>
      ) : null}

      {address ? (
        <Card>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <MapPin size={28} color={t.colors.brandAccent} weight="fill" />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="headline">{address.line1}</AppText>
              <AppText variant="subhead">{[address.city, [address.state, address.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</AppText>
              <AppText variant="footnote" secondary>
                {address.county ?? 'County not found'} · {address.geocodeSource}
              </AppText>
              <Button label="Change" variant="ghost" onPress={() => { setAddress(null); setResults(null); }} />
            </View>
          </View>
        </Card>
      ) : null}
      {address && !isLoudoun(address.county) ? (
        <AppText variant="footnote" secondary>
          Detailed local layers are available for Loudoun County. Elsewhere, Emercity uses national data.
        </AppText>
      ) : null}

      <FormSection title="About your home">
        <ChipSelect label="Home type" value={home.homeType} onChange={(v) => set({ homeType: v })} options={HOME_TYPES} />
        {apartment ? <Stepper label="Floor" value={home.floorLevel} onChange={(v) => set({ floorLevel: v })} step={1} min={1} max={60} /> : null}
        <SwitchRow label="Basement?" value={home.hasBasement} onChange={(v) => set({ hasBasement: v })} />
        <SwitchRow label="Generator?" value={home.hasGenerator} onChange={(v) => set({ hasGenerator: v })} />
        {home.hasGenerator ? <Stepper label="Generator watts (optional)" value={home.generatorWatts} onChange={(v) => set({ generatorWatts: v })} step={500} min={500} max={30000} allowUnknown /> : null}
        <SwitchRow label="Home battery?" value={home.hasBatteryBackup} onChange={(v) => set({ hasBatteryBackup: v })} />
        <ChipSelect label="Heating" value={home.heatingType} onChange={(v) => set({ heatingType: v })} options={HEATING} />
      </FormSection>
    </SetupFrame>
  );
}
