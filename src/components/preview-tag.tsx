import { Eye } from 'phosphor-react-native';
import { View } from 'react-native';

import { useTheme } from '@/theme/theme';

import { AppText } from './text';

/**
 * Marks content that uses temporary preview data instead of a real engine
 * (see src/preview/phase1-preview.ts). Remove with the preview data.
 */
export function PreviewTag({ detail }: { detail?: string }) {
  const t = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Preview data${detail ? `. ${detail}` : ''}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: t.radius.chip,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: t.colors.textSecondary,
      }}>
      <Eye size={12} color={t.colors.textSecondary} weight="bold" />
      <AppText variant="caption" color={t.colors.textSecondary}>
        Preview{detail ? ` · ${detail}` : ''}
      </AppText>
    </View>
  );
}
