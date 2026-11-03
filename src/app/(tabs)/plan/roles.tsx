import { useLocalSearchParams } from 'expo-router';

import { isHazard } from '@/domain/hazards';
import { Roles } from '@/screens/plan/roles';

/** Roles and tasks (§15.4). */
export default function RolesRoute() {
  const { hazard } = useLocalSearchParams<{ hazard?: string }>();
  return <Roles initialHazard={isHazard(hazard) ? hazard : undefined} />;
}
