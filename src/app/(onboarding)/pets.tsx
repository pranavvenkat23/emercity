import { useLocalSearchParams } from 'expo-router';

import { PetsStep } from '@/screens/onboarding/pets';

/** ONB-07 */
export default function PetsRoute() {
  const { i } = useLocalSearchParams<{ i?: string }>();
  return <PetsStep key={i ?? '0'} index={Number(i ?? 0)} />;
}
