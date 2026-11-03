import { router } from 'expo-router';
import { CaretDown, CaretUp, ShareNetwork, WarningCircle } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, Share, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { HAZARD_ICON } from '@/components/icons';
import { PriorityCard } from '@/components/priority-card';
import { Screen, SectionHeader } from '@/components/screen';
import { SourceChip } from '@/components/source-chip';
import { AppText } from '@/components/text';
import { mapAlert } from '@/domain/alerts';
import { HAZARD_LABEL, hazardColor } from '@/domain/hazards';
import { useHousehold } from '@/hooks/use-household';
import { usePriorities } from '@/hooks/use-priorities';
import type { Alert } from '@/models/types';
import { markAlertSeen, useAlertHistory } from '@/services/alerts';
import { openSource } from '@/services/links';
import { useConditions } from '@/stores/conditions-store';
import { useTheme } from '@/theme/theme';

const when = (iso: string) => new Date(iso).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' });

/** HOME-02 Alert detail (§6.5). */
export function AlertDetail({ alertId }: { alertId: string }) {
  const t = useTheme();
  const alerts = useConditions((s) => s.alerts);
  const history = useAlertHistory();
  const alert: Alert | undefined = alerts?.value.find((a) => a.id === alertId) ?? history.find((a) => a.id === alertId);
  const [open, setOpen] = useState(true);
  const hazard = alert ? (mapAlert(alert).hazard ?? alert.mappedHazard) : null;
  const priorities = usePriorities(hazard ?? 'outage');
  const { subjects } = useHousehold();

  if (!alert) {
    return (
      <Screen header={<AppBar title="Alert" back />}>
        <EmptyState icon={WarningCircle} message="This alert is no longer available. It may have expired." />
      </Screen>
    );
  }
  const color = hazard ? hazardColor(hazard, t.colors) : t.colors.severityCritical;
  const IconCmp = hazard ? HAZARD_ICON[hazard] : WarningCircle;
  const pill = (label: string) => (
    <View key={label} style={{ borderWidth: 1.5, borderColor: t.colors.borderDefault, borderRadius: t.radius.chip, paddingHorizontal: 10, paddingVertical: 3 }}>
      <AppText variant="caption" weight="600">
        {label}
      </AppText>
    </View>
  );

  return (
    <Screen header={<AppBar title="Alert" back />}>
      {alert.isDemo ? (
        <AppText variant="footnote" weight="700" color={t.colors.textSecondary}>
          DEMO · This alert is simulated for demonstration and was not issued by any agency.
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <IconCmp size={48} color={color} weight="bold" />
        <AppText variant="title1" style={{ flex: 1 }} accessibilityRole="header">
          {alert.event}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[`Severity: ${alert.severity}`, `Urgency: ${alert.urgency}`, `Certainty: ${alert.certainty}`].map(pill)}
      </View>
      <AppText variant="subhead" secondary>
        From {when(alert.effective)} until {when(alert.expires)}
        {alert.areaDesc ? ` · ${alert.areaDesc}` : ''}
      </AppText>

      {hazard ? (
        <>
          <SectionHeader title="What this means for your household" />
          {(priorities?.order ?? []).slice(0, 3).map((p) => {
            const s = subjects.get(p.subjectId);
            return s ? <PriorityCard key={p.subjectId} rank={p.rank} name={s.name} kind={s.kind} tier={p.tier} conditions={s.conditions.map((c) => c.type)} variant="compact" /> : null;
          })}
        </>
      ) : null}

      <Card>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48 }}>
          <AppText variant="headline" style={{ flex: 1 }}>
            Official text
          </AppText>
          {open ? <CaretUp size={18} color={t.colors.textSecondary} /> : <CaretDown size={18} color={t.colors.textSecondary} />}
        </Pressable>
        {open ? (
          <View style={{ gap: t.space.sm }}>
            {alert.headline ? <AppText variant="body" weight="600">{alert.headline}</AppText> : null}
            {alert.description ? <AppText variant="body">{alert.description}</AppText> : null}
            {alert.instruction ? (
              <>
                <AppText variant="subhead" weight="700">
                  Instructions
                </AppText>
                <AppText variant="body">{alert.instruction}</AppText>
              </>
            ) : null}
            <AppText variant="footnote" secondary>
              Shown exactly as issued.
            </AppText>
          </View>
        ) : null}
      </Card>

      {hazard ? (
        <Button
          label={`Start Emergency Mode for ${HAZARD_LABEL[hazard]}`}
          variant="critical"
          size="emergency"
          onPress={() => router.push({ pathname: '/emergency', params: { hazard, alertId: alert.id } })}
        />
      ) : null}
      <Button
        label="Share alert"
        icon={ShareNetwork}
        variant="secondary"
        onPress={() => Share.share({ message: `${alert.event}: ${alert.headline}${alert.url ? `\n${alert.url}` : ''}` }).catch(() => {})}
      />
      <Button label={alert.seenAt ? 'Seen' : 'Mark as seen'} variant="ghost" disabled={!!alert.seenAt} onPress={() => markAlertSeen(alert.id)} />

      <View style={{ gap: 6 }}>
        <SourceChip source={alert.isDemo ? 'Demo' : alert.source} fetchedAt={alerts?.fetchedAt ?? null} kind="alerts" />
        {alert.url && !alert.isDemo ? <Button label="Open the official alert" variant="ghost" onPress={() => openSource(alert.url!)} /> : null}
      </View>
    </Screen>
  );
}
