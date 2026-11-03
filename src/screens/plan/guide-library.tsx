import { router } from 'expo-router';
import { BookOpen, ChatCircleText, MagnifyingGlass } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { HAZARD_ICON } from '@/components/icons';
import { Screen, SectionHeader } from '@/components/screen';
import { AppText } from '@/components/text';
import { HAZARD_LABEL, HAZARD_TAB_ORDER, hazardColor } from '@/domain/hazards';
import { useHousehold } from '@/hooks/use-household';
import { useTopRiskHazard } from '@/hooks/use-priorities';
import { GUIDE_TOPICS, guidesForHazard, guidesForHousehold, guidesForTopic, searchGuides, type Guide } from '@/reference/guides';
import { useTheme } from '@/theme/theme';

const open = (g: Guide) => router.push({ pathname: '/guide/[id]', params: { id: g.id } });

function GuideCard({ g, width = 220 }: { g: Guide; width?: number }) {
  const t = useTheme();
  const h = g.hazards[0];
  const IconCmp = h ? HAZARD_ICON[h] : BookOpen;
  return (
    <Card onPress={() => open(g)} accessibilityLabel={`${g.title}, ${g.readMinutes} minute read`} style={{ width, minHeight: 112, gap: 8 }}>
      <IconCmp size={24} color={h ? hazardColor(h, t.colors) : t.colors.brandAccent} weight="bold" />
      <AppText variant="headline">{g.title}</AppText>
      <AppText variant="caption" secondary>
        {g.readMinutes} min
      </AppText>
    </Card>
  );
}

function Row({ title, guides }: { title: string; guides: Guide[] }) {
  const t = useTheme();
  if (!guides.length) return null;
  return (
    <View style={{ gap: t.space.xs }}>
      <SectionHeader title={title} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: t.space.sm, paddingRight: t.space.md }}>
        {guides.map((g) => (
          <GuideCard key={g.id} g={g} />
        ))}
      </ScrollView>
    </View>
  );
}

/** PLAN-10 Guide library (§18.1). Search runs on the device. */
export function GuideLibrary() {
  const t = useTheme();
  const { snapshot } = useHousehold();
  const top = useTopRiskHazard();
  const [q, setQ] = useState('');
  const results = useMemo(() => searchGuides(q), [q]);
  const mine = useMemo(() => (snapshot ? guidesForHousehold(snapshot, [top]) : []), [snapshot, top]);

  return (
    <Screen header={<AppBar title="Guides" back />}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderWidth: 1,
          borderColor: t.colors.borderDefault,
          borderRadius: t.radius.button,
          backgroundColor: t.colors.surfaceCard,
          paddingHorizontal: 12,
          minHeight: 52,
        }}>
        <MagnifyingGlass size={20} color={t.colors.textSecondary} />
        <TextInput
          accessibilityLabel="Search guides"
          value={q}
          onChangeText={setQ}
          placeholder="Search guides (works offline)"
          placeholderTextColor={t.colors.textSecondary}
          style={{ flex: 1, color: t.colors.textPrimary, fontSize: t.type.body.fontSize }}
          returnKeyType="search"
          autoCorrect={false}
        />
      </View>

      {q.trim() ? (
        results.length ? (
          results.map((g) => (
            <Pressable key={g.id} accessibilityRole="button" onPress={() => open(g)} style={{ minHeight: 56, justifyContent: 'center' }}>
              <AppText variant="headline">{g.title}</AppText>
              <AppText variant="footnote" secondary>
                {g.readMinutes} min
              </AppText>
            </Pressable>
          ))
        ) : (
          <AppText variant="body" secondary>
            No guides match “{q}”.
          </AppText>
        )
      ) : (
        <>
          <Row title="For your household" guides={mine} />
          {HAZARD_TAB_ORDER.map((h) => (
            <Row key={h} title={HAZARD_LABEL[h]} guides={guidesForHazard(h)} />
          ))}
          <SectionHeader title="Topics" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {GUIDE_TOPICS.map((topic) => (
              <Pressable
                key={topic}
                accessibilityRole="button"
                onPress={() => setQ(topic === 'Food and water' ? 'food' : topic.split(' ')[0].toLowerCase())}
                style={{ borderRadius: t.radius.chip, borderWidth: 1.5, borderColor: t.colors.borderDefault, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' }}>
                <AppText variant="subhead">
                  {topic} · {guidesForTopic(topic).length}
                </AppText>
              </Pressable>
            ))}
          </View>
          <Button label="Ask a question" icon={ChatCircleText} variant="ghost" onPress={() => router.push('/(tabs)/plan/ask')} />
        </>
      )}
    </Screen>
  );
}
