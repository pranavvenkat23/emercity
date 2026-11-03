import { router, type Href } from 'expo-router';
import { CalendarCheck, CaretRight, LightningSlash } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AlertBanner } from '@/components/alert-banner';
import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { CountdownView } from '@/components/countdown-view';
import { MemberAvatar } from '@/components/member-avatar';
import { PowerOutSheet } from '@/components/power-out-sheet';
import { PriorityCard } from '@/components/priority-card';
import { ReadinessRing } from '@/components/readiness-ring';
import { Screen, SectionHeader } from '@/components/screen';
import { TierIcon } from '@/components/severity';
import { AppText } from '@/components/text';
import { alertLevel, isActive, issuingOffice, mapAlert, sortAlerts } from '@/domain/alerts';
import { formatDuration } from '@/domain/freshness';
import { HAZARD_LABEL, TIER_LABEL, tierColor } from '@/domain/hazards';
import { computeNudges } from '@/domain/nudges';
import { computeHazardScores } from '@/domain/risk';
import { useCountdowns } from '@/hooks/use-countdowns';
import { useHousehold } from '@/hooks/use-household';
import { useNow } from '@/hooks/use-now';
import { usePriorities, useTopRiskHazard } from '@/hooks/use-priorities';
import { useReadiness } from '@/hooks/use-readiness';
import type { Hazard } from '@/models/types';
import { useConditions } from '@/stores/conditions-store';
import { useOutage } from '@/stores/outage-store';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

import { GaugeMiniCard } from './gauge-mini-card';
import { GuideOfTheWeek } from './guide-of-the-week';
import { AlertHero, OutageHero, StatusHero } from './status-hero';

/** HOME-01 (§6): normal, active-alert, and outage layouts. */
export function Home() {
  const t = useTheme();
  const now = useNow(15_000);
  const { snapshot, subjects, isDemo } = useHousehold();
  const online = useSession((s) => s.online);
  const alerts = useConditions((s) => s.alerts);
  const alertsError = useConditions((s) => s.alertsError);
  const weather = useConditions((s) => s.weather);
  const risk = useConditions((s) => s.risk);
  const outage = useOutage((s) => s.current);
  const { countdowns, running } = useCountdowns();
  const readiness = useReadiness();
  const topRisk = useTopRiskHazard();
  const [powerSheet, setPowerSheet] = useState(false);

  const active = useMemo(
    () => sortAlerts((alerts?.value ?? []).filter((a) => a.affectsAddress && isActive(a, now))),
    [alerts, now],
  );
  // Alerts that map to a hazard take over Home (§6.2); others (e.g. Frost
  // Advisory) show as a banner at the top so Home never says "All clear".
  const heroAlert = active.find((a) => (mapAlert(a).hazard ?? a.mappedHazard) != null);
  const bannerAlerts = active.filter((a) => a !== heroAlert);
  const alertHazard: Hazard | null = heroAlert ? (mapAlert(heroAlert).hazard ?? heroAlert.mappedHazard) : null;
  const orderHazard: Hazard = alertHazard ?? (running ? 'outage' : topRisk);
  const priorities = usePriorities(orderHazard);

  const nudges = useMemo(() => {
    if (!snapshot) return [];
    const scores = computeHazardScores(snapshot, risk?.value.factors ?? []);
    return computeNudges(snapshot, { now, scores, drills: snapshot.drills }).slice(0, 3);
  }, [snapshot, risk, now]);

  if (!snapshot) return null;
  const h = snapshot.household;
  const special = !!heroAlert || running;

  const weatherGlyph = weather?.value.tempF != null ? (
    <AppText variant="subhead" color={t.scheme === 'light' ? t.colors.onBrandPrimary : t.colors.textPrimary} accessibilityLabel={`${Math.round(weather.value.tempF)} degrees`}>
      {Math.round(weather.value.tempF)}°{weather.simulated ? ' demo' : ''}
    </AppText>
  ) : null;

  const strip = (
    <>
      <SectionHeader title="If something happens" />
      <Card
        onPress={() => router.push({ pathname: '/(tabs)/plan/priorities', params: { hazard: orderHazard } })}
        accessibilityLabel={`Priority order for ${HAZARD_LABEL[orderHazard]}. Open full order`}>
        <View style={{ gap: t.space.sm }}>
          <AppText variant="subhead" secondary>
            {HAZARD_LABEL[orderHazard]} · who needs help first
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: t.space.md, paddingTop: 6 }}>
            {(priorities?.order ?? []).slice(0, 4).map((p) => {
              const s = subjects.get(p.subjectId);
              if (!s) return null;
              return (
                <View key={p.subjectId} style={{ alignItems: 'center', gap: 4, width: 72 }}>
                  <MemberAvatar name={s.name} kind={s.kind} tier={p.tier} rank={p.rank} size={56} />
                  <AppText variant="footnote" align="center">
                    {s.name}
                  </AppText>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Card>
    </>
  );

  const readinessCard = readiness ? (
    <Card onPress={() => router.push('/(tabs)/plan/readiness')} accessibilityLabel={`${readiness.score} percent ready. Open breakdown`}>
      <View style={styles.readinessRow}>
        <ReadinessRing score={readiness.score} criticalGap={readiness.criticalGap} />
        <View style={{ flex: 1, gap: 6 }}>
          <AppText variant="headline">{readiness.score}% ready</AppText>
          {readiness.steps[0] ? (
            <View style={styles.inline}>
              <TierIcon tier={readiness.steps[0].tier} size={18} />
              <AppText variant="subhead" style={{ flex: 1 }}>
                {readiness.steps[0].tier !== 'standard' ? (
                  <AppText variant="subhead" weight="700" color={tierColor(readiness.steps[0].tier, t.colors)}>
                    {TIER_LABEL[readiness.steps[0].tier]}:{' '}
                  </AppText>
                ) : null}
                {readiness.steps[0].text}
              </AppText>
            </View>
          ) : (
            <AppText variant="subhead" secondary>
              Everything on your list is done.
            </AppText>
          )}
        </View>
      </View>
    </Card>
  ) : null;

  const readyCountdowns = countdowns.filter((c) => c.totalMs != null).slice(0, 3);
  const countdownCard = (
    <>
      <SectionHeader title="If power went out now" />
      <Card onPress={() => router.push('/(tabs)/(home)/countdowns')} accessibilityLabel="Countdowns if power went out now. Open all">
        <View style={{ gap: t.space.sm }}>
          {readyCountdowns.length === 0 ? (
            <AppText variant="body" secondary>
              Nothing in your home needs a countdown. Food timers start when power goes out.
            </AppText>
          ) : (
            readyCountdowns.map((c) => (
              <View key={c.id} style={styles.countRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.inline}>
                    <TierIcon tier={c.tier} size={16} />
                    <AppText variant="subhead" weight="600" style={{ flexShrink: 1 }}>
                      {c.name}
                    </AppText>
                  </View>
                  <AppText variant="caption" secondary>
                    {c.userEstimate ? 'Your estimate' : c.source.name}
                  </AppText>
                </View>
                <AppText variant="title2" weight="700" tabular color={c.tier === 'critical' ? t.colors.severityCritical : t.colors.textPrimary}>
                  {formatDuration(c.totalMs!)}
                </AppText>
              </View>
            ))
          )}
          <View style={[styles.inline, { justifyContent: 'flex-end' }]}>
            <AppText variant="subhead" color={t.colors.brandPrimary}>
              All countdowns
            </AppText>
            <CaretRight size={16} color={t.colors.brandPrimary} />
          </View>
        </View>
      </Card>
    </>
  );

  const thisWeek =
    nudges.length > 0 ? (
      <>
        <SectionHeader title="This week" />
        <Card padded={false}>
          {nudges.map((n, i) => (
            <View
              key={n.id}
              accessible
              accessibilityLabel={`${n.tier !== 'standard' ? TIER_LABEL[n.tier] + ': ' : ''}${n.text}`}
              style={[styles.weekRow, { padding: t.space.md, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.colors.borderDefault }]}>
              <CalendarCheck size={22} color={t.colors.brandAccent} />
              <AppText variant="body" style={{ flex: 1 }}>
                {n.text}
              </AppText>
              <TierIcon tier={n.tier} size={18} />
            </View>
          ))}
        </Card>
      </>
    ) : null;

  return (
    <Screen header={<AppBar title={h.name} badge={isDemo ? 'DEMO' : undefined} right={weatherGlyph} />}>
      {isDemo ? (
        <AppText variant="footnote" secondary>
          Demo household · fictional people and simulated data
        </AppText>
      ) : null}

      {running && outage ? (
        <>
          <OutageHero startedAt={outage.startedAt} now={now} simulated={outage.simulated} onPowerBack={() => router.push('/(tabs)/(home)/power-back')} />
          <SectionHeader title="Countdowns" />
          {countdowns.map((c) => (
            <CountdownView key={c.id} c={c} />
          ))}
        </>
      ) : heroAlert ? (
        <>
          <AlertHero alert={heroAlert} extra={active.length - 1} now={now} simulated={alerts?.simulated} />
          <SectionHeader title="Your priority order" />
          {(priorities?.order ?? []).slice(0, 5).map((p) => {
            const s = subjects.get(p.subjectId);
            return s ? <PriorityCard key={p.subjectId} rank={p.rank} name={s.name} kind={s.kind} tier={p.tier} conditions={s.conditions.map((c) => c.type)} variant="compact" /> : null;
          })}
          {alertHazard === 'flood' ? <GaugeMiniCard /> : null}
        </>
      ) : bannerAlerts.length ? (
        <>
        {bannerAlerts.slice(0, 2).map((a) => (
          <AlertBanner
            key={a.id}
            level={alertLevel(a.event)}
            hazard={a.mappedHazard}
            headline={a.event}
            issuer={issuingOffice(a.senderName)}
            until={new Date(a.expires).toLocaleTimeString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
            source={alerts?.simulated ? 'Demo, simulated' : 'NWS'}
            fetchedAt={alerts?.fetchedAt ?? null}
            isDemo={alerts?.simulated}
            onPress={() => router.push({ pathname: '/(tabs)/(home)/alert/[alertId]', params: { alertId: a.id } })}
          />
        ))}
        <Button label="Power is out" icon={LightningSlash} variant="secondary" onPress={() => setPowerSheet(true)} />
        </>
      ) : (
        <StatusHero zip={h.address.zip} alerts={alerts} alertsError={alertsError} online={online} now={now} onPowerOut={() => setPowerSheet(true)} />
      )}

      {special ? (
        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: t.colors.borderDefault }]} />
          <AppText variant="footnote" secondary>
            Everyday
          </AppText>
          <View style={[styles.line, { backgroundColor: t.colors.borderDefault }]} />
        </View>
      ) : null}

      {readinessCard}
      {heroAlert ? null : strip}
      {alertHazard === 'flood' ? null : <GaugeMiniCard />}
      {running ? null : countdownCard}
      {thisWeek}
      <GuideOfTheWeek onOpen={(id) => router.push({ pathname: '/guide/[id]', params: { id } } as Href)} />

      <PowerOutSheet visible={powerSheet} onClose={() => setPowerSheet(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  readinessRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
});

