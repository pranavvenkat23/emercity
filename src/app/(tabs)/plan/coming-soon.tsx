import { useLocalSearchParams } from 'expo-router';
import { Hammer } from 'phosphor-react-native';

import { AppBar } from '@/components/app-bar';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';

/** Placeholder for Plan screens built in later phases. Says so plainly. */
export default function ComingSoonRoute() {
  const { title, phase, detail } = useLocalSearchParams<{ title?: string; phase?: string; detail?: string }>();
  return (
    <Screen header={<AppBar title={title ?? 'Coming soon'} back />}>
      <EmptyState
        icon={Hammer}
        title={phase ? `Built in Phase ${phase}` : 'Not built yet'}
        message={detail ?? 'This part of Emercity is on the build plan and is not available in this version.'}
      />
    </Screen>
  );
}
