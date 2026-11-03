import { useLocalSearchParams } from 'expo-router';

import type { SupplyLocation } from '@/models/types';
import { SupplyCheck } from '@/screens/plan/supply-check';

export default function SupplyCheckRoute() {
  const { kit } = useLocalSearchParams<{ kit?: SupplyLocation }>();
  return <SupplyCheck kit={kit ?? 'go-bag'} />;
}
