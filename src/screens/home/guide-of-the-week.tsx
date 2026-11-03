import { BookOpen } from 'phosphor-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/card';
import { SectionHeader } from '@/components/screen';
import { AppText } from '@/components/text';
import { useHousehold } from '@/hooks/use-household';
import { useTopRiskHazard } from '@/hooks/use-priorities';
import { guideOfTheWeek } from '@/reference/guides';
import { useTheme } from '@/theme/theme';

/** Guide of the week (§6.1 item 8): matched to season and risk profile. */
export function GuideOfTheWeek({ onOpen }: { onOpen: (id: string) => void }) {
  const t = useTheme();
  const { snapshot } = useHousehold();
  const top = useTopRiskHazard();
  const guide = useMemo(() => (snapshot ? guideOfTheWeek(snapshot, [top], new Date()) : null), [snapshot, top]);
  if (!guide) return null;
  return (
    <>
      <SectionHeader title="Guide of the week" />
      <Card onPress={() => onOpen(guide.id)} accessibilityLabel={`Guide: ${guide.title}, ${guide.readMinutes} minute read`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BookOpen size={28} color={t.colors.brandAccent} weight="duotone" />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="headline">{guide.title}</AppText>
            <AppText variant="footnote" secondary>
              {guide.readMinutes} min · works offline
            </AppText>
          </View>
        </View>
      </Card>
    </>
  );
}
