import { Redirect } from 'expo-router';

import { useSession } from '@/stores/session-store';

/** Entry: route to onboarding, household setup, or the app. */
export default function Index() {
  const mode = useSession((s) => s.mode);
  const snapshot = useSession((s) => s.snapshot);
  const onboardingDone = useSession((s) => s.onboardingDone);

  if (mode === 'none') return <Redirect href="/welcome" />;
  if (!snapshot || !onboardingDone) return <Redirect href="/setup" />;
  return <Redirect href="/(tabs)/(home)" />;
}
