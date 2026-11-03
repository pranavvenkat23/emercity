import { Stack, useLocalSearchParams } from 'expo-router';

import { DrillRun } from '@/screens/plan/drill-run';

/** PLAN-07 / PLAN-08. Deep link emercity://drill/{drillId} (§3.3). */
export default function DrillRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <DrillRun key={id} id={id} />
    </>
  );
}
