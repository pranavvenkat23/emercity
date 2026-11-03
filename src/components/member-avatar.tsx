import { PawPrint } from 'phosphor-react-native';
import { View } from 'react-native';

import { tierColor } from '@/domain/hazards';
import { initials } from '@/domain/members';
import type { Tier } from '@/models/types';
import { useTheme } from '@/theme/theme';
import { withAlpha } from '@/theme/contrast';

import { AppText } from './text';

export interface MemberAvatarProps {
  name: string;
  kind?: 'person' | 'pet';
  /** Ring color follows the subject's top tier (§2.5). */
  tier?: Tier | null;
  size?: number;
  /** Small "dependent" badge for members without an account. */
  dependent?: boolean;
  /** Overlay a rank number badge (Home priorities strip). */
  rank?: number;
}

export function MemberAvatar({ name, kind = 'person', tier, size = 48, dependent, rank }: MemberAvatarProps) {
  const t = useTheme();
  const ring = tier && tier !== 'standard' ? tierColor(tier, t.colors) : t.colors.borderDefault;
  const ringWidth = tier && tier !== 'standard' ? 3 : 1.5;
  const fill = withAlpha(t.colors.brandAccent, t.scheme === 'dark' ? 0.22 : 0.14);

  return (
    <View style={{ width: size, height: size }} importantForAccessibility="no-hide-descendants">
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ringWidth,
          borderColor: ring,
          backgroundColor: fill,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {kind === 'pet' ? (
          <PawPrint size={size * 0.46} color={t.colors.brandPrimary} weight="bold" />
        ) : (
          <AppText
            variant={size >= 64 ? 'title2' : 'subhead'}
            weight="700"
            color={t.colors.brandPrimary}
            allowFontScaling={false}>
            {initials(name)}
          </AppText>
        )}
      </View>
      {rank != null ? (
        <View
          style={{
            position: 'absolute',
            top: -4,
            left: -4,
            minWidth: 22,
            height: 22,
            borderRadius: 11,
            paddingHorizontal: 4,
            backgroundColor: tier === 'critical' ? t.colors.severityCritical : t.colors.brandPrimary,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: t.colors.surfaceCard,
          }}>
          <AppText
            variant="caption"
            weight="700"
            allowFontScaling={false}
            color={tier === 'critical' ? t.colors.onCritical : t.colors.onBrandPrimary}>
            {rank}
          </AppText>
        </View>
      ) : null}
      {dependent ? (
        <View
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: t.colors.statusStale,
            borderWidth: 2,
            borderColor: t.colors.surfaceCard,
          }}
        />
      ) : null}
    </View>
  );
}
