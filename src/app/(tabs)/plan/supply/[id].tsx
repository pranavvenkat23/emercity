import { useLocalSearchParams } from 'expo-router';

import { SupplyDetail } from '@/screens/plan/supply-detail';

/** PLAN-05. Deep link emercity://supplies/{itemId} (§3.3). */
export default function SupplyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SupplyDetail key={id} id={id} />;
}
