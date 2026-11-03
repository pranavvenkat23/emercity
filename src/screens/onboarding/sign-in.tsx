import { router } from 'expo-router';
import { AppleLogo, Check, CircleDashed, EnvelopeSimple, GoogleLogo, Lock } from 'phosphor-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { QuickAddChip } from '@/components/quick-add-chip';
import { SegmentedControl } from '@/components/segmented-control';
import { AppText } from '@/components/text';
import {
  ageGatePermissions,
  AUTH_ERROR_COPY,
  classifyAuthError,
  isValidEmail,
  PASSWORD_RULES,
  passwordIssues,
  type AgeGateAnswer,
  type AuthErrorKind,
} from '@/domain/account-rules';
import { authErrorCode, signInWithEmail, signUpWithEmail } from '@/services/auth';
import { accountProfile, KV_ACCOUNT_ADULT, pullHousehold, saveUserProfile } from '@/services/cloud-sync';
import { isFirebaseConfigured } from '@/services/firebase';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

type Mode = 'create' | 'signin';

/** ONB-02 Create account / sign in (§5.2). */
export function SignIn() {
  const t = useTheme();
  const db = useSession((s) => s.db);
  const enterDemo = useSession((s) => s.enterDemo);
  const setAccount = useSession((s) => s.setAccountMode);
  const adopt = useSession((s) => s.adoptHousehold);
  const [mode, setMode] = useState<Mode>('create');
  const [age, setAge] = useState<AgeGateAnswer | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorKind | null>(null);
  const setLocalMode = useSession((s) => s.setLocalMode);
  const [providerSheet, setProviderSheet] = useState<string | null>(null);
  const [privacySheet, setPrivacySheet] = useState(false);

  const issues = passwordIssues(password);
  const perms = age ? ageGatePermissions(age) : null;
  const canSubmit =
    isValidEmail(email) && (mode === 'signin' ? password.length > 0 : issues.length === 0 && !!perms?.canCreateAccount);

  const submit = async () => {
    if (!db) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'create') {
        const u = await signUpWithEmail(db.kv, email, password);
        await setAccount();
        const isAdult18Plus = age === '18-plus';
        await db.kv.set(KV_ACCOUNT_ADULT, isAdult18Plus ? '1' : '0');
        // The profile's age answer is what the security rules check before
        // letting this account create a household (§5.2, §19.1).
        await saveUserProfile(u.uid, { email: u.email, ageConfirmed13Plus: true, isAdult18Plus }).catch(() => {});
        router.replace('/setup');
        return;
      }
      const u = await signInWithEmail(db.kv, email, password);
      await setAccount();
      // A phone that's new to this account: bring the household down from the cloud.
      const profile = await accountProfile(u.uid).catch(() => null);
      if (profile) await db.kv.set(KV_ACCOUNT_ADULT, profile.isAdult18Plus ? '1' : '0');
      const [hid] = profile?.householdIds ?? [];
      if (hid && (await pullHousehold(hid).catch(() => false))) {
        await adopt(hid);
        router.replace('/(tabs)/(home)');
      } else {
        router.replace('/setup');
      }
    } catch (e) {
      setError(classifyAuthError(authErrorCode(e)));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    minHeight: 52,
    color: t.colors.textPrimary,
    backgroundColor: t.colors.surfaceCard,
    borderColor: t.colors.borderDefault,
    borderWidth: 1,
    borderRadius: t.radius.button,
    paddingHorizontal: t.space.sm,
    fontSize: t.type.body.fontSize,
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surfaceBase }}>
      <AppBar title={mode === 'create' ? 'Create your account' : 'Sign in'} back showAvatar={false} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: t.space.md, gap: t.space.md, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
          <Button label="Continue with Apple" variant="secondary" icon={AppleLogo} onPress={() => setProviderSheet('Apple')} />
          <Button label="Continue with Google" variant="secondary" icon={GoogleLogo} onPress={() => setProviderSheet('Google')} />

          <View style={styles.orRow}>
            <View style={[styles.line, { backgroundColor: t.colors.borderDefault }]} />
            <AppText variant="footnote" secondary>
              or with email
            </AppText>
            <View style={[styles.line, { backgroundColor: t.colors.borderDefault }]} />
          </View>

          <SegmentedControl
            accessibilityLabel="Create account or sign in"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
            options={[
              { value: 'create', label: 'Create account' },
              { value: 'signin', label: 'Sign in' },
            ]}
          />

          {mode === 'create' ? (
            <View style={{ gap: t.space.xs }}>
              <AppText variant="headline">How old are you?</AppText>
              <View style={styles.chips}>
                <QuickAddChip label="Under 13" selected={age === 'under-13'} onPress={() => setAge('under-13')} />
                <QuickAddChip label="13–17" selected={age === '13-17'} onPress={() => setAge('13-17')} />
                <QuickAddChip label="18 or older" selected={age === '18-plus'} onPress={() => setAge('18-plus')} />
              </View>
              {age === 'under-13' ? (
                <AppText variant="callout" color={t.colors.severityUrgent}>
                  You need to be 13 or older to have an account. Ask an adult to add you to their household.
                </AppText>
              ) : null}
              {age === '13-17' ? (
                <AppText variant="callout" secondary>
                  You can join a household with an invite from an adult. Only adults can create a household.
                </AppText>
              ) : null}
            </View>
          ) : null}

          <View style={{ gap: 6 }}>
            <AppText variant="subhead" weight="600" nativeID="emailLabel">
              Email
            </AppText>
            <View style={styles.inputRow}>
              <EnvelopeSimple size={20} color={t.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                accessibilityLabel="Email"
                accessibilityLabelledBy="emailLabel"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                style={[inputStyle, { flex: 1, paddingLeft: 40 }]}
              />
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="subhead" weight="600" nativeID="pwLabel">
              Password
            </AppText>
            <View style={styles.inputRow}>
              <Lock size={20} color={t.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                accessibilityLabel="Password"
                accessibilityLabelledBy="pwLabel"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                textContentType={mode === 'create' ? 'newPassword' : 'password'}
                style={[inputStyle, { flex: 1, paddingLeft: 40 }]}
              />
            </View>
            {mode === 'create' ? (
              <View style={{ gap: 4, marginTop: 4 }} accessibilityLabel="Password rules">
                {PASSWORD_RULES.map((r) => {
                  const ok = !issues.includes(r);
                  return (
                    <View key={r.id} style={styles.rule} accessible accessibilityLabel={`${r.label}: ${ok ? 'met' : 'not met'}`}>
                      {ok ? (
                        <Check size={16} color={t.colors.statusSafe} weight="bold" />
                      ) : (
                        <CircleDashed size={16} color={t.colors.textSecondary} />
                      )}
                      <AppText variant="footnote" color={ok ? t.colors.statusSafe : t.colors.textSecondary}>
                        {r.label}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>

          {error ? (
            <View accessibilityRole="alert" style={{ gap: t.space.xs }}>
              <AppText variant="callout" color={t.colors.severityCritical}>
                {AUTH_ERROR_COPY[error]}
              </AppText>
              {error === 'email-in-use' ? (
                <Button label="Sign in instead" variant="ghost" onPress={() => setMode('signin')} />
              ) : null}
              {error === 'network' || error === 'not-configured' ? (
                <Button
                  label="Explore demo"
                  variant="secondary"
                  onPress={async () => {
                    await enterDemo();
                    router.replace('/(tabs)/(home)');
                  }}
                />
              ) : null}
            </View>
          ) : null}

          <Button
            label={mode === 'create' ? 'Create account' : 'Sign in'}
            onPress={submit}
            disabled={!canSubmit}
            loading={busy}
          />

          <Pressable accessibilityRole="button" onPress={() => setPrivacySheet(true)}>
            <AppText variant="footnote" secondary align="center">
              Your health info is encrypted and only shared with people in your household.{' '}
              <AppText variant="footnote" color={t.colors.brandPrimary} weight="600">
                How we protect it
              </AppText>
            </AppText>
          </Pressable>

          {!isFirebaseConfigured ? (
            <AppText variant="caption" secondary align="center">
              Developer note: Firebase isn&apos;t configured in this build (.env missing), so accounts can&apos;t be
              created yet.
            </AppText>
          ) : null}
          {__DEV__ ? (
            <Button
              label="Developer: set up on this phone without an account"
              variant="ghost"
              onPress={async () => {
                await setLocalMode();
                router.replace('/setup');
              }}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet visible={!!providerSheet} onClose={() => setProviderSheet(null)} title={`Continue with ${providerSheet ?? ''}`}>
        <AppText variant="body">
          {providerSheet} sign-in needs provider setup in Firebase{providerSheet === 'Apple' ? ' and an Apple Developer account' : ''}.
          It will be connected when the shared household plan is built (Phase 10). Use email for now.
        </AppText>
      </BottomSheet>
      <BottomSheet visible={privacySheet} onClose={() => setPrivacySheet(false)} title="How we protect it">
        <AppText variant="body">• Your plan is stored in an encrypted database on your phone. The key stays in the phone&apos;s secure keychain.</AppText>
        <AppText variant="body">• Only signed-in members of your household can see your household&apos;s plan.</AppText>
        <AppText variant="body">• Health details are never put in notifications, logs, or analytics.</AppText>
        <AppText variant="body">• Your information is never sold or used for ads.</AppText>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: 12, zIndex: 1 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
