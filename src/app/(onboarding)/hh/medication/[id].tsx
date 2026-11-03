import { useLocalSearchParams } from 'expo-router';

import { MedicationDetail, type MedicationPrefill } from '@/screens/household/medication-detail';

/** HH-05 / HH-08 (prefilled from a scan or search). */
export default function MedicationRoute() {
  const { id, ...prefill } = useLocalSearchParams<{ id: string } & Record<keyof MedicationPrefill, string>>();
  return <MedicationDetail key={id} id={id} prefill={prefill} />;
}
