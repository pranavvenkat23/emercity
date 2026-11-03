import { Redirect, useLocalSearchParams } from 'expo-router';
import { UsersThree } from 'phosphor-react-native';

import { AppBar } from '@/components/app-bar';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { useSession } from '@/stores/session-store';

/** emercity://invite/{code} to ONB-03 with the code prefilled (§3.3). */
export default function InviteLinkRoute() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const mode = useSession((s) => s.mode);
  if (mode === 'none') return <Redirect href={{ pathname: '/setup', params: { code } }} />;
  return (
    <Screen header={<AppBar title="Invite" back />}>
      <EmptyState icon={UsersThree} title="You’re already in a household" message="Joining another household with a code arrives with shared plans." />
    </Screen>
  );
}
