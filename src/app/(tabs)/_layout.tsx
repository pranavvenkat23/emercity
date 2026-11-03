import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';

/** Four tabs + center Emergency button (§3.1). Order matches the spec. */
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="household" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="plan" />
    </Tabs>
  );
}
