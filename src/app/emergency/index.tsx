import { useLocalSearchParams } from 'expo-router';

import { isHazard } from '@/domain/hazards';
import { HazardPicker } from '@/screens/emergency/picker';

/** EM-01. Deep link emercity://emergency?hazard={hazard} preselects (§3.3). */
export default function EmergencyIndex() {
  const { hazard, alertId } = useLocalSearchParams<{ hazard?: string; alertId?: string }>();
  return <HazardPicker preselect={isHazard(hazard) ? hazard : undefined} alertId={alertId} />;
}
