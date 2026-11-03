import { router, type Href } from 'expo-router';
import { CaretRight, CloudCheck, UserPlus } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ReadinessRing } from '@/components/readiness-ring';
import { SetupFrame } from '@/components/setup-frame';
import { TierIcon } from '@/components/severity';
import { AppText } from '@/components/text';
import { useReadiness } from '@/hooks/use-readiness';
import { stepHref } from '@/screens/plan/readiness';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/** ONB-12 Done (§5.12). */
export function DoneStep() {
  const t = useTheme();
  const r = useReadiness();
  const complete = useSession((s) => s.completeOnboarding);
  const mode = useSession((s) => s.mode);

  // Finishing setup unlocks the tabs; go Home first so Back returns there.
  const finish = async (then?: Href) => {
    await complete();
    router.replace('/(tabs)/(home)');
    if (then) setTimeout(() => router.push(then), 50);
  };

  return (
    <SetupFrame stage="Ready" title="Your plan is ready" back={false}>
      {r ? (
        <View style={{ alignItems: 'center', gap: t.space.sm }}>
          <ReadinessRing size="large" score={r.score} criticalGap={r.criticalGap} />
          <AppText variant="title2" align="center">
            You’re {r.score}% prepared.
          </AppText>
        </View>
      ) : null}
      {r?.steps.length ? (
        <Card padded={false}>
          {r.steps.slice(0, 3).map((s, i) => (
            <Pressable key={s.text} accessibilityRole="button" onPress={() => finish(stepHref(s))} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: t.space.md, minHeight: 56, borderTopWidth: i ? 1 : 0, borderColor: t.colors.borderDefault }}>
              <TierIcon tier={s.tier} size={18} />
              <AppText variant="body" style={{ flex: 1 }}>
                {s.text}
              </AppText>
              <CaretRight size={18} color={t.colors.textSecondary} />
            </Pressable>
          ))}
        </Card>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <CloudCheck size={20} color={t.colors.statusSafe} />
        <AppText variant="footnote" secondary style={{ flex: 1 }}>
          Guides, emergency steps and medicine storage rules are saved on this phone and work without signal.
        </AppText>
      </View>
      {mode === 'account' ? <Button label="Invite your household" icon={UserPlus} variant="secondary" onPress={() => finish('/(tabs)/household/invite')} /> : null}
      <Button label="Go to Home" size="emergency" onPress={() => finish()} />
    </SetupFrame>
  );
}
