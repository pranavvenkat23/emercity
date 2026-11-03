import { Stack } from 'expo-router';

import { HouseholdPathsContext } from '@/hooks/use-household-paths';

/** Household editors reused inside guided setup (the tabs aren't open yet). */
export default function SetupHouseholdStack() {
  return (
    <HouseholdPathsContext.Provider value="/(onboarding)/hh">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </HouseholdPathsContext.Provider>
  );
}
