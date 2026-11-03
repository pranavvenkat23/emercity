import { Redirect, useLocalSearchParams } from 'expo-router';

/** Deep link emercity://countdown/{itemId} to HOME-03 focused on that item (§3.3). */
export default function CountdownDeepLink() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  return <Redirect href={{ pathname: '/(tabs)/(home)/countdowns', params: { itemId } }} />;
}
