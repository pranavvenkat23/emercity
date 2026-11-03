import { useLocalSearchParams } from 'expo-router';

import { PlaybookSteps } from '@/screens/emergency/steps';

/** EM-03. `subject` filters to one person's steps (EM-04 tap); `list` opens the step list. */
export default function StepsRoute() {
  const { stepId, subject, list } = useLocalSearchParams<{ stepId?: string; subject?: string; list?: string }>();
  return <PlaybookSteps startStepId={stepId} subjectFilter={subject} openList={list === '1'} />;
}
