import { useLocalSearchParams } from 'expo-router';

import { ScanMedication } from '@/screens/household/scan';

/** HH-07 */
export default function ScanRoute() {
  const { ownerId } = useLocalSearchParams<{ ownerId?: string }>();
  return <ScanMedication ownerId={ownerId || undefined} />;
}
