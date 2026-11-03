import type { Icon } from 'phosphor-react-native';
import { Package, Pill, Plug, Snowflake } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { formatDuration, spokenDuration } from '@/domain/freshness';
import { TIER_LABEL, tierColor } from '@/domain/hazards';
import type { Tier } from '@/models/types';
import { useTheme } from '@/theme/theme';

import { Button } from './button';
import { ProgressRing } from './progress-ring';
import { SourceChip } from './source-chip';
import { AppText } from './text';

export type CountdownItemKind = 'medication' | 'device' | 'fridge' | 'freezer';

/**
 * running: power is out, timer counting down
 * ready: "if power went out now" safe time (not started)
 * paused: power restored, timer stopped
 * expired: safe time passed
 * no-data: no verified rule and nothing entered from the label; never guessed (§11.2)
 * unsafe: indoor temperature is above the product's maximum: act now
 */
export type CountdownState = 'running' | 'ready' | 'paused' | 'expired' | 'no-data' | 'unsafe';

const KIND_ICON: Record<CountdownItemKind, Icon> = {
  medication: Pill,
  device: Plug,
  fridge: Snowflake,
  freezer: Package,
};

export interface CountdownTileProps {
  kind: CountdownItemKind;
  name: string;
  ownerName?: string;
  state: CountdownState;
  /** Remaining safe time in ms (running) or total safe time (ready). */
  remainingMs: number | null;
  totalMs: number | null;
  /** e.g. "In fridge · keep door closed", "Internal battery". */
  phase?: string;
  tier: Tier;
  source: { name: string; note?: string };
  /** Whether the number is the user's own estimate rather than a cited rule. */
  userEstimate?: boolean;
  action?: { label: string; onPress: () => void };
  /** Link shown on expired/unsafe tiles (§11.4 "What to do"). */
  whatToDo?: { label: string; onPress: () => void };
  onPress?: () => void;
  size?: 'default' | 'large';
}

/** Live safe-time tile (§2.5, §11.4). Every tile carries the confirm line (§11). */
export function CountdownTile({
  kind,
  name,
  ownerName,
  state,
  remainingMs,
  totalMs,
  phase,
  tier,
  source,
  userEstimate,
  action,
  whatToDo,
  size = 'default',
}: CountdownTileProps) {
  const t = useTheme();
  const IconCmp = KIND_ICON[kind];
  const expired = state === 'expired' || state === 'unsafe';
  const noData = state === 'no-data';
  const accent = expired ? t.colors.severityCritical : tierColor(tier, t.colors);
  const progress = remainingMs != null && totalMs ? remainingMs / totalMs : state === 'ready' ? 1 : 0;
  const ringSize = size === 'large' ? 72 : 60;

  const timeText = noData ? '--:--' : expired ? '0:00' : remainingMs != null ? formatDuration(remainingMs) : '--:--';
  const spoken = noData
    ? 'No safe-time data'
    : state === 'unsafe'
      ? 'Unsafe now. Move to cooler'
      : expired
      ? 'Safe time passed'
      : remainingMs != null
        ? `${spokenDuration(remainingMs)} ${state === 'running' ? 'left' : 'if power went out now'}`
        : 'unknown';

  return (
    <View
      accessible
      accessibilityLabel={`${name}${ownerName ? `, ${ownerName}` : ''}. ${spoken}. ${
        tier !== 'standard' ? TIER_LABEL[tier] + '.' : ''
      }${userEstimate ? ' Your estimate.' : ''}`}
      style={[
        styles.tile,
        {
          backgroundColor: expired ? t.colors.severityCritical : t.colors.surfaceCard,
          borderColor: t.colors.borderDefault,
          borderRadius: t.radius.card,
          padding: t.space.md,
        },
      ]}>
      <View style={styles.row}>
        <ProgressRing
          size={ringSize}
          stroke={6}
          progress={progress}
          color={expired ? t.colors.onCritical : accent}
          trackColor={expired ? t.colors.onCritical + '55' : t.colors.surfaceSunken}>
          <IconCmp size={ringSize * 0.4} color={expired ? t.colors.onCritical : accent} weight="bold" />
        </ProgressRing>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="headline" color={expired ? t.colors.onCritical : undefined}>
            {name}
          </AppText>
          {ownerName ? (
            <AppText variant="footnote" color={expired ? t.colors.onCritical : t.colors.textSecondary}>
              {ownerName}
            </AppText>
          ) : null}
          <AppText variant="footnote" color={expired ? t.colors.onCritical : t.colors.textSecondary}>
            {state === 'unsafe'
              ? phase ?? 'Unsafe: move to cooler now'
              : expired
              ? 'Safe time passed'
              : noData
                ? 'No safe-time data for this product'
                : phase ?? (state === 'ready' ? 'If power went out now' : '')}
          </AppText>
        </View>
        <AppText
          variant={size === 'large' ? 'title1' : 'title2'}
          weight="700"
          tabular
          color={expired ? t.colors.onCritical : noData ? t.colors.textSecondary : accent}>
          {timeText}
        </AppText>
      </View>
      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant={expired ? 'inverse' : 'secondary'}
          size={t.mode === 'emergency' ? 'emergency' : 'default'}
        />
      ) : null}
      {whatToDo && expired ? (
        <Button label={whatToDo.label} onPress={whatToDo.onPress} variant="inverse" />
      ) : null}
      <View style={styles.footer}>
        <SourceChip
          source={userEstimate ? 'Your estimate' : source.name}
          note={userEstimate ? 'entered by you' : source.note}
        />
        <AppText variant="caption" color={expired ? t.colors.onCritical : t.colors.textSecondary}>
          {kind === 'fridge' || kind === 'freezer' ? 'When in doubt, throw it out.' : 'Confirm with your pharmacist or device supplier.'}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { gap: 12, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  footer: { gap: 6 },
});
