import { useLocalSearchParams } from 'expo-router';

import { MemberEdit } from '@/screens/household/member-edit';

/** HH-03 */
export default function MemberEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MemberEdit id={id} />;
}
