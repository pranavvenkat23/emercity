import { router } from 'expo-router';
import { CheckCircle, CloudSlash, LightningSlash, Question, WarningCircle } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { HAZARD_ICON } from '@/components/icons';
import { SourceChip } from '@/components/source-chip';
import { AppText } from '@/components/text';
import { instructionExcerpt, issuingOffice, mapAlert } from '@/domain/alerts';
import { freshness } from '@/domain/freshness';
import { HAZARD_LABEL, hazardColor } from '@/domain/hazards';
import type { Alert } from '@/models/types';
import type { Sourced } from '@/stores/conditions-store';
import { blend } from '@/theme/contrast';
import { useTheme } from '@/theme/theme';

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/**
 * Status hero (§6.1 item 2, §10.6). "All clear" only when alerts were
 * checked within their freshness window and none affect the address.
 */
export function StatusHero({
  zip,
  alerts,
  alertsError,
  online,
  now,
  onPowerOut,
}: {
  zip: string;
  alerts: Sourced<Alert[]> | null;
  alertsError: string | null;
  online: boolean | null;
  now: Date;
  onPowerOut: () => void;
}) {
  const t = useTheme();
  const fresh = alerts ? freshness('alerts', alerts.fetchedAt, now) === 'fresh' : false;

  let icon = <Question size={28} color={t.colors.statusStale} weight="bold" />;
  let title = 'Alerts not checked yet';
  let sub = 'Emercity checks official alerts for your address when you’re online.';
  let tint = t.colors.surfaceSunken;

  if (online === false) {
    icon = <CloudSlash size={28} color={t.colors.statusStale} weight="bold" />;
    title = "Offline: can't check alerts";
    sub = alerts ? `Last checked ${clock(alerts.fetchedAt)}.` : 'Alerts have not been checked yet.';
  } else if (alertsError) {
    icon = <WarningCircle size={28} color={t.colors.severityImportant} weight="bold" />;
    title = 'Alerts may be delayed';
    sub = 'The alert service didn’t respond. Check weather.gov.';
  } else if (alerts && fresh) {
    icon = <CheckCircle size={28} color={t.colors.statusSafe} weight="fill" />;
    title = `All clear for ${zip}`;
    sub = 'No alerts for your address.';
    tint = blend(t.colors.statusSafe, t.colors.surfaceCard, 0.14);
  } else if (alerts && !fresh) {
    icon = <WarningCircle size={28} color={t.colors.statusStale} weight="bold" />;
    title = 'Alert check is out of date';
    sub = `Last checked ${clock(alerts.fetchedAt)}. Emercity will check again shortly.`;
  }

  return (
    <Card
      onPress={() => router.push('/(tabs)/(home)/alert-history')}
      accessibilityLabel={`${title}. ${sub}`}
      accessibilityHint="Opens alert history"
      style={{ minHeight: 140, gap: t.space.sm }}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: tint }]}>{icon}</View>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="title2">{title}</AppText>
          <AppText variant="subhead" secondary>
            {sub}
          </AppText>
        </View>
      </View>
      <View style={styles.footer}>
        {alerts ? (
          <SourceChip source={alerts.simulated ? 'Demo, simulated' : alerts.source} fetchedAt={alerts.fetchedAt} kind="alerts" now={now} offlineCached={online === false} />
        ) : (
          <SourceChip source="NWS" fetchedAt={null} kind="alerts" now={now} />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Power is out"
          onPress={onPowerOut}
          style={[styles.chip, { borderColor: t.colors.hazardOutage, borderRadius: t.radius.chip }]}>
          <LightningSlash size={16} color={t.colors.hazardOutage} weight="bold" />
          <AppText variant="subhead" weight="600" color={t.colors.hazardOutage}>
            Power is out
          </AppText>
        </Pressable>
      </View>
    </Card>
  );
}

/** Alert hero (§6.2 items 1–2). */
export function AlertHero({ alert, extra, now, simulated }: { alert: Alert; extra: number; now: Date; simulated?: boolean }) {
  const t = useTheme();
  const map = mapAlert(alert);
  const hazard = map.hazard ?? alert.mappedHazard;
  const color = hazard ? hazardColor(hazard, t.colors) : t.colors.severityCritical;
  const IconCmp = hazard ? HAZARD_ICON[hazard] : WarningCircle;
  return (
    <View style={{ gap: t.space.sm }}>
      <Card
        onPress={() => router.push({ pathname: '/(tabs)/(home)/alert/[alertId]', params: { alertId: alert.id } })}
        accessibilityLabel={`${simulated ? 'Demo alert. ' : ''}${alert.event}. Until ${clock(alert.expires)}`}
        style={{ backgroundColor: blend(color, t.colors.surfaceCard, 0.16), borderColor: color, borderWidth: 2, gap: t.space.sm }}>
        <View style={styles.row}>
          <IconCmp size={44} color={color} weight="bold" />
          <View style={{ flex: 1, gap: 4 }}>
            {simulated ? (
              <AppText variant="caption" weight="700" color={t.colors.textSecondary} style={{ letterSpacing: 0.6 }}>
                DEMO · SIMULATED ALERT
              </AppText>
            ) : null}
            <AppText variant="title2">{alert.event}</AppText>
            <AppText variant="body">{instructionExcerpt(alert)}</AppText>
            <AppText variant="subhead" secondary>
              Until {clock(alert.expires)} · {issuingOffice(alert.senderName)}
            </AppText>
          </View>
        </View>
        <SourceChip source={simulated ? 'Demo, simulated' : alert.source} fetchedAt={now.toISOString()} kind="alerts" now={now} />
      </Card>
      {hazard ? (
        <Button
          label={`Start Emergency Mode for ${HAZARD_LABEL[hazard]}`}
          variant="critical"
          size="emergency"
          onPress={() => router.push({ pathname: '/emergency', params: { hazard, alertId: alert.id } })}
        />
      ) : null}
      <View style={styles.links}>
        <Button label="View alert details" variant="ghost" fullWidth={false} onPress={() => router.push({ pathname: '/(tabs)/(home)/alert/[alertId]', params: { alertId: alert.id } })} />
        {extra > 0 ? (
          <Button label={`+${extra} more alert${extra === 1 ? '' : 's'}`} variant="ghost" fullWidth={false} onPress={() => router.push('/(tabs)/(home)/alert-history')} />
        ) : null}
      </View>
    </View>
  );
}

/** Outage hero (§6.3). */
export function OutageHero({ startedAt, now, simulated, onPowerBack }: { startedAt: string; now: Date; simulated?: boolean; onPowerBack: () => void }) {
  const t = useTheme();
  // The dark-mode outage purple is light, so text flips to near-black (AA contrast).
  const fg = t.scheme === 'dark' ? t.colors.surfaceBase : '#FFFFFF';
  const mins = Math.max(0, Math.floor((now.getTime() - new Date(startedAt).getTime()) / 60_000));
  const dur = mins < 60 ? `${mins} m` : `${Math.floor(mins / 60)} h ${mins % 60} m`;
  return (
    <Card style={{ backgroundColor: t.colors.hazardOutage, borderColor: t.colors.hazardOutage, gap: t.space.sm }}>
      <View style={styles.row}>
        <LightningSlash size={36} color={fg} weight="bold" />
        <View style={{ flex: 1, gap: 2 }}>
          {simulated ? (
            <AppText variant="caption" weight="700" color={fg} style={{ letterSpacing: 0.6 }}>
              DEMO · SIMULATED OUTAGE
            </AppText>
          ) : null}
          <AppText variant="title2" color={fg} accessibilityLabel={`Power out since ${clock(startedAt)}, ${dur}`}>
            Power out since {clock(startedAt)}
          </AppText>
          <AppText variant="headline" color={fg} tabular>
            {dur}
          </AppText>
        </View>
      </View>
      <Button label="Open outage steps" variant="inverse" onPress={() => router.push({ pathname: '/emergency', params: { hazard: 'outage' } })} />
      <Button label="Power's back" variant="inverse" onPress={onPowerBack} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, paddingHorizontal: 14, minHeight: 44 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
