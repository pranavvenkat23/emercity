import { Baby, Dog, Package } from 'phosphor-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AlertBanner } from '@/components/alert-banner';
import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { CountdownTile } from '@/components/countdown-tile';
import { EmptyState } from '@/components/empty-state';
import { MemberAvatar } from '@/components/member-avatar';
import { PriorityCard } from '@/components/priority-card';
import { QuickAddChip } from '@/components/quick-add-chip';
import { ReadinessRing } from '@/components/readiness-ring';
import { RiskChip } from '@/components/risk-chip';
import { Screen, SectionHeader } from '@/components/screen';
import { SeverityPill } from '@/components/severity';
import { SourceChip } from '@/components/source-chip';
import { StepCard } from '@/components/step-card';
import { AppText } from '@/components/text';
import { ThemeScope, useTheme } from '@/theme/theme';

/**
 * Developer-only gallery of every core component and state (§2.5), in
 * Prepare and Emergency styling. All content here is sample text.
 */
export function ComponentGallery() {
  const [count, setCount] = useState(2);
  const now = new Date();
  const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

  return (
    <Screen header={<AppBar title="Component gallery" subtitle="Sample content only" back showAvatar={false} sheet />}>
      <SectionHeader title="Severity" />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <SeverityPill tier="critical" />
        <SeverityPill tier="urgent" />
        <SeverityPill tier="important" />
      </View>

      <SectionHeader title="PriorityCard" />
      <PriorityCard rank={1} name="Grandma" kind="person" tier="critical" conditions={['oxygen-dependent', 'mobility-walker']} />
      <PriorityCard rank={2} name="Dad" kind="person" tier="urgent" conditions={['diabetes-insulin']} pinned />
      <PriorityCard rank={3} name="Biscuit" kind="pet" tier="important" />
      <PriorityCard rank={4} name="Mom" kind="person" tier="standard" variant="compact" />

      <SectionHeader title="CountdownTile" />
      <CountdownTile kind="device" name="Grandma's concentrator" state="running" remainingMs={92 * 60_000} totalMs={240 * 60_000} phase="Internal battery" tier="critical" source={{ name: 'Your estimate' }} userEstimate action={{ label: 'Switched to next backup', onPress: () => {} }} />
      <CountdownTile kind="medication" name="Sample insulin pens" ownerName="Dad" state="running" remainingMs={3 * 3_600_000 + 12 * 60_000} totalMs={4 * 3_600_000} phase="In fridge · keep door closed" tier="urgent" source={{ name: 'Sample source', note: 'rule reviewed Sep 2026' }} action={{ label: 'Moved to cooler', onPress: () => {} }} />
      <CountdownTile kind="freezer" name="Freezer food" state="ready" remainingMs={48 * 3_600_000} totalMs={48 * 3_600_000} tier="standard" source={{ name: 'FoodSafety.gov (USDA)' }} />
      <CountdownTile kind="medication" name="Unknown product" state="no-data" remainingMs={null} totalMs={null} tier="standard" source={{ name: 'No rule yet' }} />
      <CountdownTile kind="fridge" name="Fridge food" state="expired" remainingMs={0} totalMs={4 * 3_600_000} tier="standard" source={{ name: 'FoodSafety.gov (USDA)' }} />

      <SectionHeader title="AlertBanner (demo samples)" />
      <AlertBanner level="warning" hazard="flood" headline="Flash Flood Warning" issuer="Sample issuer" until="9:45 PM" source="NWS" fetchedAt={minsAgo(4)} isDemo />
      <AlertBanner level="watch" hazard="winter" headline="Winter Storm Watch" issuer="Sample issuer" source="NWS" fetchedAt={minsAgo(25)} isDemo />
      <AlertBanner level="advisory" hazard="winter" headline="Winter Weather Advisory" issuer="Sample issuer" source="NWS" fetchedAt={minsAgo(2)} isDemo />
      <AlertBanner level="statement" hazard="flood" headline="Hydrologic Statement" issuer="Sample issuer" source="NWS" fetchedAt={minsAgo(2)} isDemo />

      <SectionHeader title="RiskChip" />
      <RiskChip label="Flood zone" value="Zone AE (sample)" level="high" source="FEMA" fetchedAt={minsAgo(60 * 24)} />
      <RiskChip label="Rail line" value="0.7 mi (sample)" level="moderate" source="Loudoun GIS" fetchedAt={minsAgo(60 * 24 * 50)} />
      <RiskChip label="Hospital" value="4.3 mi (sample)" level="low" source="Loudoun GIS" fetchedAt={minsAgo(60)} />
      <RiskChip label="County floodplain" value="Outside layer coverage" level="unknown" source="Loudoun GIS" fetchedAt={null} />

      <SectionHeader title="SourceChip" />
      <View style={{ gap: 8 }}>
        <SourceChip source="NWS" fetchedAt={minsAgo(4)} kind="alerts" />
        <SourceChip source="NOAA NWPS" fetchedAt={minsAgo(90)} kind="gauge" />
        <SourceChip source="FEMA shelters" fetchedAt={minsAgo(30)} kind="shelter" offlineCached />
        <SourceChip source="NWS" fetchedAt={null} kind="alerts" />
      </View>

      <SectionHeader title="Chips, avatars, ring" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <QuickAddChip label="Baby (under 1)" icon={Baby} count={count} onPress={() => setCount((c) => c + 1)} />
        <QuickAddChip label="Dog" icon={Dog} onPress={() => {}} />
        <QuickAddChip label="Oxygen" selected onPress={() => {}} />
        <QuickAddChip label="Disabled" disabled onPress={() => {}} />
      </View>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <MemberAvatar name="Grandma" tier="critical" rank={1} />
        <MemberAvatar name="Dad" tier="urgent" />
        <MemberAvatar name="Biscuit" kind="pet" tier="important" />
        <MemberAvatar name="Ben" dependent />
        <ReadinessRing score={72} />
        <ReadinessRing score={64} criticalGap />
      </View>

      <SectionHeader title="Buttons" />
      <Button label="Primary" onPress={() => {}} />
      <Button label="Secondary" variant="secondary" onPress={() => {}} />
      <Button label="Start Emergency Mode for Flood" variant="critical" size="emergency" onPress={() => {}} />

      <SectionHeader title="EmptyState" />
      <EmptyState icon={Package} message="We'll build your list from your household." action={{ label: 'Build my list', onPress: () => {} }} />

      <SectionHeader title="Emergency styling" />
      <ThemeScope mode="emergency">
        <EmergencySamples />
      </ThemeScope>
    </Screen>
  );
}

function EmergencySamples() {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.colors.surfaceBase, padding: t.space.md, borderRadius: t.radius.card, gap: t.space.md }}>
      <AppText variant="footnote" secondary>
        Emergency Mode: dark palette, one step larger type.
      </AppText>
      <StepCard
        stepNumber={3}
        totalSteps={11}
        instruction="Wake Grandma and move her upstairs."
        tier="critical"
        assignee="Ben"
        detail={['Sample detail line one', 'Sample detail line two']}
        onDone={() => {}}
        onSkip={() => {}}
        onCantDo={() => {}}
        onSpeak={() => {}}
      />
      <PriorityCard rank={1} name="Grandma" kind="person" tier="critical" progressLabel="2 of 3 steps done" />
      <PriorityCard rank={3} name="Dad" kind="person" tier="urgent" />
    </View>
  );
}
