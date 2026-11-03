import { router } from 'expo-router';
import { ClockCounterClockwise } from 'phosphor-react-native';
import { View } from 'react-native';

import { AlertBanner } from '@/components/alert-banner';
import { AppBar } from '@/components/app-bar';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { alertLevel, issuingOffice } from '@/domain/alerts';
import { useAlertHistory } from '@/services/alerts';

/** Alert history (§10.5): alerts for the address over the last year. */
export function AlertHistory() {
  const entries = useAlertHistory();
  return (
    <Screen header={<AppBar title="Alert history" back />}>
      {entries.length === 0 ? (
        <EmptyState icon={ClockCounterClockwise} message="No alerts for your address in the last year." />
      ) : (
        entries.map((e) => (
          <View key={e.id} style={{ gap: 4 }}>
            <AlertBanner
              level={alertLevel(e.event)}
              hazard={e.mappedHazard}
              headline={e.event}
              issuer={issuingOffice(e.senderName)}
              until={new Date(e.expires).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              source={e.isDemo ? 'Demo' : e.source}
              fetchedAt={e.firstSeenAt}
              isDemo={e.isDemo}
              onPress={() => router.push({ pathname: '/(tabs)/(home)/alert/[alertId]', params: { alertId: e.id } })}
            />
            <AppText variant="footnote" secondary>
              {e.emergencyStartedBy ? `Emergency Mode started by ${e.emergencyStartedBy}` : 'Emergency Mode not started'}
            </AppText>
          </View>
        ))
      )}
    </Screen>
  );
}
