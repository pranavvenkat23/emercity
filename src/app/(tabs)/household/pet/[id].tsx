import { useLocalSearchParams } from 'expo-router';

import { PetProfile } from '@/screens/household/pet-profile';

/** HH-04 */
export default function PetRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PetProfile id={id} />;
}
