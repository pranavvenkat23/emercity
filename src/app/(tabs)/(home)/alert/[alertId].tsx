import { useLocalSearchParams } from 'expo-router';

import { AlertDetail } from '@/screens/home/alert-detail';

/** HOME-02. Deep link emercity://alert/{alertId} (§3.3). */
export default function AlertRoute() {
  const { alertId } = useLocalSearchParams<{ alertId: string }>();
  return <AlertDetail alertId={alertId} />;
}
