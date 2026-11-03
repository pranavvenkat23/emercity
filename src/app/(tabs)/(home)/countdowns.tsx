import { useLocalSearchParams } from 'expo-router';

import { Countdowns } from '@/screens/home/countdowns';

/** HOME-03 All countdowns. */
export default function CountdownsRoute() {
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  return <Countdowns focusItemId={itemId} />;
}
