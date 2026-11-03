import { useLocalSearchParams } from 'expo-router';

import { GaugeDetail } from '@/screens/map/gauge-detail';

/** MAP-03. Deep link emercity://gauge/{gaugeId} (§3.3). */
export default function GaugeRoute() {
  const { gaugeId } = useLocalSearchParams<{ gaugeId: string }>();
  return <GaugeDetail id={gaugeId} />;
}
