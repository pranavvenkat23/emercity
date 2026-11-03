import type { Icon } from 'phosphor-react-native';
import { View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { withAlpha } from '@/theme/contrast';

import { Button } from './button';
import { AppText } from './text';

export interface EmptyStateProps {
  icon: Icon;
  message: string;
  title?: string;
  action?: { label: string; onPress: () => void };
}

/** Illustration, one sentence, one button (§2.5, §25.1). */
export function EmptyState({ icon: IconCmp, title, message, action }: EmptyStateProps) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: t.space.md, paddingVertical: t.space.xl, paddingHorizontal: t.space.md }}>
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: withAlpha(t.colors.brandAccent, 0.12),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <IconCmp size={44} color={t.colors.brandAccent} weight="duotone" />
      </View>
      {title ? (
        <AppText variant="title2" align="center">
          {title}
        </AppText>
      ) : null}
      <AppText variant="body" secondary align="center" style={{ maxWidth: 420 }}>
        {message}
      </AppText>
      {action ? <Button label={action.label} onPress={action.onPress} fullWidth={false} /> : null}
    </View>
  );
}
