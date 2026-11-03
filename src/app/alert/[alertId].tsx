import { useLocalSearchParams } from 'expo-router';

import { AlertDetail } from '@/screens/home/alert-detail';

/** HOME-02 as a modal: deep link emercity://alert/{alertId} (§3.3) and from Emergency Mode. */
export default function AlertModalRoute() {
  const { alertId } = useLocalSearchParams<{ alertId: string }>();
  return <AlertDetail alertId={alertId} />;
}
