import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { ArrowSquareOut, BookOpen, ChatCircleText, ShareNetwork, SpeakerHigh, Stop } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Share, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { CriticalBar } from '@/components/critical-bar';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { SeverityPill } from '@/components/severity';
import { AppText } from '@/components/text';
import { HAZARD_SHORT_LABEL } from '@/domain/hazards';
import { GUIDE_REVIEW, GUIDES_BY_ID } from '@/reference/guides';
import { openSource } from '@/services/links';
import { useA11y } from '@/stores/a11y-store';
import { blend } from '@/theme/contrast';
import { useTheme } from '@/theme/theme';

/** PLAN-11 Guide article (§18.2). Fully offline. */
export function GuideArticle({ id }: { id: string }) {
  const t = useTheme();
  const guide = GUIDES_BY_ID[id];
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => void Speech.stop(), []);

  if (!guide) {
    return (
      <Screen header={<AppBar title="Guide" back />}>
        <EmptyState icon={BookOpen} message="This guide isn't in the library." />
      </Screen>
    );
  }

  const speak = () => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    const text = [guide.title, 'Do this now.', ...guide.doNow, ...guide.sections.flatMap((s) => [s.heading, s.body, s.callout?.text ?? ''])].join('. ');
    setSpeaking(true);
    Speech.speak(text, { language: 'en-US', rate: 0.95 * useA11y.getState().speechRate, onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false) });
  };

  return (
    <Screen header={<AppBar title="Guide" back showAvatar={false} />}>
      <AppText variant="title1" accessibilityRole="header">
        {guide.title}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <AppText variant="footnote" secondary>
          {guide.readMinutes} min read
        </AppText>
        {guide.hazards.map((h) => (
          <View key={h} style={{ borderRadius: t.radius.chip, backgroundColor: t.colors.surfaceSunken, paddingHorizontal: 8, paddingVertical: 2 }}>
            <AppText variant="caption">{HAZARD_SHORT_LABEL[h]}</AppText>
          </View>
        ))}
      </View>

      <Card style={{ borderColor: t.colors.brandAccent, borderWidth: 1.5 }}>
        <View style={{ gap: t.space.sm }}>
          <AppText variant="headline">Do this now</AppText>
          {guide.doNow.map((step, i) => (
            <View key={step} style={{ flexDirection: 'row', gap: 10 }}>
              <AppText variant="body" weight="700" color={t.colors.brandAccent} tabular>
                {i + 1}.
              </AppText>
              <AppText variant="body" style={{ flex: 1 }}>
                {step}
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      {guide.sections.map((s) => (
        <View key={s.heading} style={{ gap: t.space.xs }}>
          <AppText variant="title2" accessibilityRole="header">
            {s.heading}
          </AppText>
          <AppText variant="body">{s.body}</AppText>
          {s.callout ? (
            <View
              accessibilityRole="alert"
              style={{
                overflow: 'hidden',
                padding: t.space.md,
                paddingLeft: t.space.md + 4,
                borderRadius: t.radius.card,
                gap: 6,
                backgroundColor: blend(s.callout.tier === 'critical' ? t.colors.severityCritical : t.colors.severityUrgent, t.colors.surfaceCard, 0.12),
              }}>
              <CriticalBar tier={s.callout.tier} pulse={false} />
              <SeverityPill tier={s.callout.tier} />
              <AppText variant="body" weight="600">
                {s.callout.text}
              </AppText>
            </View>
          ) : null}
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label={speaking ? 'Stop' : 'Read aloud'} icon={speaking ? Stop : SpeakerHigh} variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={speak} />
        <Button
          label="Share"
          icon={ShareNetwork}
          variant="secondary"
          fullWidth={false}
          style={{ flex: 1 }}
          onPress={() => Share.share({ message: `${guide.title}\n\nDo this now:\n${guide.doNow.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n\nSources: ${guide.sources.map((s) => s.url).join(' ')}` }).catch(() => {})}
        />
      </View>

      <View style={{ gap: 6 }}>
        <AppText variant="headline">Sources</AppText>
        {guide.sources.map((s) => (
          <Pressable key={s.url} accessibilityRole="link" accessibilityLabel={`Source: ${s.name}`} onPress={() => openSource(s.url)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
            <ArrowSquareOut size={18} color={t.colors.brandPrimary} />
            <AppText variant="subhead" color={t.colors.brandPrimary} style={{ flex: 1 }}>
              {s.name}
            </AppText>
          </Pressable>
        ))}
        <AppText variant="footnote" secondary>
          {GUIDE_REVIEW.reviewed
            ? `Reviewed ${GUIDE_REVIEW.date} by ${GUIDE_REVIEW.reviewer}`
            : 'Based on the sources above. Not yet reviewed by a qualified local reviewer. Always follow official instructions and call 911 in an emergency.'}
        </AppText>
      </View>

      <Button label="Ask a question" icon={ChatCircleText} variant="ghost" onPress={() => router.push('/(tabs)/plan/ask')} />
    </Screen>
  );
}
