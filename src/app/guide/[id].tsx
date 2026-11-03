import { useLocalSearchParams } from 'expo-router';

import { GuideArticle } from '@/screens/plan/guide-article';

/** PLAN-11 Guide article. A root modal so it opens above Emergency Mode too. */
export default function GuideRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GuideArticle id={id} />;
}
