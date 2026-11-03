import { useLocalSearchParams } from 'expo-router';

import type { MeetingPointType } from '@/models/types';
import { MeetingPointEditor } from '@/screens/plan/meeting-point-editor';

/** MAP-04 */
export default function MeetingPointRoute() {
  const { type } = useLocalSearchParams<{ type: MeetingPointType }>();
  return <MeetingPointEditor key={type} type={type} />;
}
