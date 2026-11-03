import { useLocalSearchParams } from 'expo-router';

import { DetailsStep } from '@/screens/onboarding/details';

/** ONB-06 */
export default function DetailsRoute() {
  const { i } = useLocalSearchParams<{ i?: string }>();
  return <DetailsStep key={i ?? '0'} index={Number(i ?? 0)} />;
}
