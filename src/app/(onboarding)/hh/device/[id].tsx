import { useLocalSearchParams } from 'expo-router';

import { DeviceDetail } from '@/screens/household/device-detail';

/** HH-09 */
export default function DeviceRoute() {
  const { id, memberId } = useLocalSearchParams<{ id: string; memberId?: string }>();
  return <DeviceDetail key={id} id={id} memberId={memberId} />;
}
