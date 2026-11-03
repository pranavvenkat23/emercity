import { useLocalSearchParams } from 'expo-router';

import { AddMedication } from '@/screens/household/add-medication';

/** HH-06 */
export default function AddMedicationRoute() {
  const { ownerId } = useLocalSearchParams<{ ownerId?: string }>();
  return <AddMedication ownerId={ownerId || undefined} />;
}
