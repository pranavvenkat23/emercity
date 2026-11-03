import { Pressable, ScrollView, View } from 'react-native';

import { HAZARD_SHORT_LABEL, HAZARD_TAB_ORDER, hazardColor } from '@/domain/hazards';
import type { Hazard } from '@/models/types';
import { useTheme } from '@/theme/theme';

import { HAZARD_ICON } from './icons';
import { AppText } from './text';

/**
 * Scrollable hazard tab row (§8.7): Outage · Winter · Flood · Fire · Hazmat ·
 * Hurricane. The household's top-risk hazard shows a small dot.
 */
export function HazardTabs({
  value,
  onChange,
  topRisk,
}: {
  value: Hazard;
  onChange: (h: Hazard) => void;
  topRisk?: Hazard | null;
}) {
  const t = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {HAZARD_TAB_ORDER.map((h) => {
        const selected = h === value;
        const color = hazardColor(h, t.colors);
        const IconCmp = HAZARD_ICON[h];
        return (
          <Pressable
            key={h}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${HAZARD_SHORT_LABEL[h]}${topRisk === h ? ', your top risk' : ''}`}
            onPress={() => onChange(h)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              minHeight: 44,
              paddingHorizontal: 14,
              borderRadius: t.radius.chip,
              borderWidth: 1.5,
              borderColor: selected ? color : t.colors.borderDefault,
              backgroundColor: selected ? color + (t.scheme === 'dark' ? '33' : '1A') : t.colors.surfaceCard,
            }}>
            <IconCmp size={18} color={color} weight={selected ? 'fill' : 'regular'} />
            <AppText variant="subhead" weight={selected ? '600' : '400'}>
              {HAZARD_SHORT_LABEL[h]}
            </AppText>
            {topRisk === h ? (
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.colors.brandAccent }} />
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
