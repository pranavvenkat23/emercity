import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { HAZARD_SHORT_LABEL, HAZARD_TAB_ORDER, TIER_LABEL, tierColor } from '@/domain/hazards';
import { rankHousehold } from '@/domain/priority/engine';
import { usePriorityContext } from '@/hooks/use-priorities';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

import { HAZARD_ICON } from './icons';
import { AppText } from './text';

/**
 * "Priority by emergency" strip (§7.2, §7.4): this subject's rank and tier
 * in each hazard's order, so it's obvious Grandma is #1 in an outage but
 * lower in a fire.
 */
export function HazardRankStrip({ subjectId }: { subjectId: string }) {
  const t = useTheme();
  const snapshot = useSession((s) => s.snapshot);
  const ctx = usePriorityContext();
  if (!snapshot) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {HAZARD_TAB_ORDER.map((h) => {
        const s = rankHousehold(snapshot, h, ctx).order.find((x) => x.subjectId === subjectId);
        if (!s) return null;
        const color = s.tier === 'standard' ? t.colors.borderDefault : tierColor(s.tier, t.colors);
        const IconCmp = HAZARD_ICON[h];
        return (
          <Pressable
            key={h}
            accessibilityRole="button"
            accessibilityLabel={`${HAZARD_SHORT_LABEL[h]}: rank ${s.rank}, ${TIER_LABEL[s.tier]}`}
            onPress={() => router.push({ pathname: '/(tabs)/plan/priorities', params: { hazard: h } })}
            style={{
              width: '31%',
              minHeight: 72,
              borderRadius: t.radius.card,
              borderWidth: s.tier === 'standard' ? 1 : 2.5,
              borderColor: color,
              backgroundColor: t.colors.surfaceCard,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              paddingVertical: 8,
            }}>
            <IconCmp size={18} color={t.colors.textSecondary} />
            <AppText variant="title2" weight="700" tabular color={s.tier === 'standard' ? t.colors.textPrimary : color}>
              #{s.rank}
            </AppText>
            <AppText variant="caption" secondary>
              {HAZARD_SHORT_LABEL[h]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
