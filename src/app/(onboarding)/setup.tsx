import { useLocalSearchParams } from 'expo-router';

import { CreateOrJoin } from '@/screens/onboarding/create-or-join';

/** ONB-03. Deep link emercity://invite/{code} prefills the code (§3.3). */
export default function SetupRoute() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  return <CreateOrJoin code={code} />;
}
