import { useLocalSearchParams } from 'expo-router';

import { MapHome } from '@/screens/map/map-home';

/** MAP-01. `?risk=1` opens with risk layers on (MAP-05, from PLAN-03 "See on map"). */
export default function MapRoute() {
  const { risk } = useLocalSearchParams<{ risk?: string }>();
  return <MapHome key={risk ?? ''} risk={risk === '1'} />;
}
