import { useLocalSearchParams } from 'expo-router';

import { isHazard } from '@/domain/hazards';
import { Priorities } from '@/screens/plan/priorities';

/** PLAN-02 Priority order by hazard. */
export default function PrioritiesRoute() {
  const { hazard } = useLocalSearchParams<{ hazard?: string }>();
  return <Priorities initialHazard={isHazard(hazard) ? hazard : undefined} />;
}
