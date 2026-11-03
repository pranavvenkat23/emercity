import { useLocalSearchParams } from 'expo-router';

import { MemberEdit } from '@/screens/household/member-edit';

/** HH-03 inside guided setup ("Something's off" on ONB-10). */
export default function SetupMemberRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MemberEdit key={id} id={id} />;
}
