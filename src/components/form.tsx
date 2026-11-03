import DateTimePicker from '@react-native-community/datetimepicker';
import { Minus, Plus } from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Switch, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { useTheme } from '@/theme/theme';

import { QuickAddChip } from './quick-add-chip';
import { AppText } from './text';

/**
 * Form controls shared by onboarding and the Household tab. Every control
 * has a visible label that is also its accessibility label, and a ≥48 pt
 * touch target (§20.2).
 */

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="subhead" weight="600">
        {label}
      </AppText>
      {children}
      {error ? (
        <AppText variant="footnote" color={t.colors.severityCritical} accessibilityRole="alert">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="footnote" secondary>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string | null;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secure?: boolean;
}

export function TextField({ label, value, onChange, placeholder, hint, error, keyboardType, multiline, maxLength, autoCapitalize, secure }: TextFieldProps) {
  const t = useTheme();
  return (
    <Field label={label} hint={hint} error={error}>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textSecondary}
        keyboardType={keyboardType}
        multiline={multiline}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secure}
        style={[
          styles.input,
          {
            color: t.colors.textPrimary,
            backgroundColor: t.colors.surfaceCard,
            borderColor: error ? t.colors.severityCritical : t.colors.borderDefault,
            borderRadius: t.radius.button,
            fontSize: t.type.body.fontSize,
            minHeight: multiline ? 96 : 52,
            textAlignVertical: multiline ? 'top' : 'center',
            paddingTop: multiline ? 12 : undefined,
          },
        ]}
      />
    </Field>
  );
}

export function SwitchRow({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={[styles.switchRow, { minHeight: t.touch.min }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body">{label}</AppText>
        {hint ? (
          <AppText variant="footnote" secondary>
            {hint}
          </AppText>
        ) : null}
      </View>
      {/* The row is the single touch target; a live Switch inside a Pressable
          can fire both handlers and toggle twice. */}
      <View pointerEvents="none">
        <Switch
          value={value}
          trackColor={{ true: t.colors.brandAccent, false: t.colors.borderDefault }}
          importantForAccessibility="no"
          accessibilityElementsHidden
        />
      </View>
    </Pressable>
  );
}

export interface StepperProps {
  label: string;
  /** null = not entered ("Not sure"). */
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  hint?: string;
  /** Show a "Not sure" option that clears the value (never guesses). */
  allowUnknown?: boolean;
}

export function Stepper({ label, value, onChange, step, min = 0, max = 100000, format = String, hint, allowUnknown }: StepperProps) {
  const t = useTheme();
  const current = value ?? 0;
  const btn = (dir: -1 | 1) => {
    const disabled = dir === -1 ? value == null || current <= min : current >= max;
    const IconCmp = dir === -1 ? Minus : Plus;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dir === -1 ? `Decrease ${label}` : `Increase ${label}`}
        disabled={disabled}
        onPress={() => onChange(Math.min(max, Math.max(min, (value ?? (dir === 1 ? min - step : min)) + dir * step)))}
        style={[
          styles.stepBtn,
          { borderColor: t.colors.borderDefault, borderRadius: t.radius.button, opacity: disabled ? 0.4 : 1 },
        ]}>
        <IconCmp size={22} color={t.colors.brandPrimary} weight="bold" />
      </Pressable>
    );
  };
  return (
    <Field label={label} hint={hint}>
      <View
        style={styles.stepRow}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: value == null ? 'Not entered' : format(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') onChange(Math.min(max, (value ?? min - step) + step));
          if (e.nativeEvent.actionName === 'decrement' && value != null) onChange(Math.max(min, value - step));
        }}>
        {btn(-1)}
        <AppText variant="title2" tabular style={{ minWidth: 110, textAlign: 'center' }}>
          {value == null ? 'Not sure' : format(value)}
        </AppText>
        {btn(1)}
        {allowUnknown && value != null ? (
          <Pressable accessibilityRole="button" onPress={() => onChange(null)} style={styles.unknownBtn}>
            <AppText variant="subhead" color={t.colors.brandPrimary}>
              Not sure
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </Field>
  );
}

export function ChipSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => (
          <QuickAddChip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
        ))}
      </View>
    </Field>
  );
}

export function MultiChipSelect<T extends string>({
  label,
  options,
  value,
  onToggle,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: Set<T>;
  onToggle: (v: T) => void;
}) {
  return (
    <Field label={label}>
      <View style={styles.chips}>
        {options.map((o) => (
          <QuickAddChip key={o.value} label={o.label} selected={value.has(o.value)} onPress={() => onToggle(o.value)} />
        ))}
      </View>
    </Field>
  );
}

/** Date field (YYYY-MM-DD). Shows the native picker; "Clear" sets null. */
export function DateField({
  label,
  value,
  onChange,
  hint,
  maximumDate,
  minimumDate,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  hint?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  const display = value
    ? new Date(`${value}T12:00:00`).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Not set';
  return (
    <Field label={label} hint={hint}>
      <View style={styles.dateRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${display}. Change`}
          onPress={() => setOpen((v) => !v)}
          style={[
            styles.input,
            styles.dateBtn,
            { borderColor: t.colors.borderDefault, borderRadius: t.radius.button, backgroundColor: t.colors.surfaceCard },
          ]}>
          <AppText variant="body" color={value ? t.colors.textPrimary : t.colors.textSecondary}>
            {display}
          </AppText>
        </Pressable>
        {value ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${label}`} onPress={() => onChange(null)} style={styles.unknownBtn}>
            <AppText variant="subhead" color={t.colors.brandPrimary}>
              Clear
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {open ? (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          themeVariant={t.scheme}
          accentColor={t.colors.brandAccent}
          onChange={(e, d) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (e.type === 'set' && d) onChange(toISODate(d));
          }}
        />
      ) : null}
    </Field>
  );
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** A titled group of fields inside a card-like surface. */
export function FormSection({ title, children }: { title?: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.colors.surfaceCard,
        borderColor: t.colors.borderDefault,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: t.radius.card,
        padding: t.space.md,
        gap: t.space.md,
      }}>
      {title ? (
        <AppText variant="headline" accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, paddingHorizontal: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  stepBtn: { width: 52, height: 52, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  unknownBtn: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBtn: { flex: 1, minHeight: 52, justifyContent: 'center' },
});
