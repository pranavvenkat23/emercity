import { router } from 'expo-router';
import { CaretRight, Flag, Warning } from 'phosphor-react-native';
import { View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { describeFromHome } from '@/domain/geo';
import { MEETING_POINT_META, MEETING_POINT_TYPES, meetingPointWarnings } from '@/domain/meeting-points';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/** Meeting points list; each opens MAP-04 (§16.4). */
export function MeetingPoints() {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  if (!snapshot) return null;
  const home = snapshot.household.address;
  return (
    <Screen header={<AppBar title="Meeting points" back />}>
      <AppText variant="body" secondary>
        Pick three places so everyone knows where to go. They show on your lock-screen card and in fire and flood steps.
      </AppText>
      {MEETING_POINT_TYPES.map((type) => {
        const meta = MEETING_POINT_META[type];
        const p = snapshot.meetingPoints.find((x) => x.type === type);
        const warn = p ? meetingPointWarnings(snapshot, p).length > 0 : false;
        return (
          <Card key={type} onPress={() => router.push({ pathname: '/(tabs)/plan/meeting-point/[type]', params: { type } })} accessibilityLabel={`${meta.title} meeting point: ${p?.name ?? 'not set'}`}>
            <View style={{ flexDirection: 'row', gap: t.space.sm, alignItems: 'center' }}>
              <Flag size={26} color={p ? t.colors.brandAccent : t.colors.textSecondary} weight={p ? 'fill' : 'regular'} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="headline">{meta.title}</AppText>
                <AppText variant="subhead" secondary={!p}>
                  {p ? p.name : meta.purpose}
                </AppText>
                {p?.lat != null && p.lng != null && home.lat != null && home.lng != null ? (
                  <AppText variant="footnote" secondary>
                    {describeFromHome({ lat: home.lat, lng: home.lng }, { lat: p.lat, lng: p.lng })}
                  </AppText>
                ) : null}
                {warn ? (
                  <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                    <Warning size={16} color={t.colors.severityImportant} weight="fill" />
                    <AppText variant="footnote">Path has stairs or slopes</AppText>
                  </View>
                ) : null}
              </View>
              <CaretRight size={18} color={t.colors.textSecondary} />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
