import { Check, Warning } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { LANGUAGE_NAME } from '@/i18n/languages';
import { UI_LANGUAGES } from '@/i18n/strings';
import { useLanguage } from '@/stores/language-store';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/** SET-04 Language (§20.1). */
export function LanguageSettings() {
  const t = useTheme();
  const db = useSession((s) => s.db);
  const lang = useLanguage((s) => s.lang);
  if (!db) return null;
  return (
    <Screen header={<AppBar title="Language" back showAvatar={false} sheet />}>
      <Card padded={false}>
        {UI_LANGUAGES.map((l, i) => (
          <Pressable
            key={l.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: lang === l.id }}
            onPress={() => useLanguage.getState().set(db.kv, l.id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: t.space.md, minHeight: 56, borderTopWidth: i ? 1 : 0, borderColor: t.colors.borderDefault }}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="headline">{LANGUAGE_NAME[l.id]}</AppText>
              {!l.reviewed ? (
                <AppText variant="footnote" secondary>
                  Menus only · not yet reviewed by a fluent speaker
                </AppText>
              ) : null}
            </View>
            {lang === l.id ? <Check size={22} color={t.colors.brandAccent} weight="bold" /> : null}
          </Pressable>
        ))}
      </Card>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <Warning size={20} color={t.colors.severityImportant} />
        <AppText variant="body" style={{ flex: 1 }}>
          Emergency steps, guides and countdown messages are in English only for now. Safety text is never machine-translated; each language is added after a fluent speaker translates and reviews it.
        </AppText>
      </View>
      <AppText variant="footnote" secondary>
        Each person’s own language is set on their profile (“Doesn’t speak English well”).
      </AppText>
    </Screen>
  );
}
