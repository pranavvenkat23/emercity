import { useLocalSearchParams } from 'expo-router';

import { MemberProfile } from '@/screens/household/member-profile';

/** HH-02 */
export default function MemberRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MemberProfile id={id} />;
}
