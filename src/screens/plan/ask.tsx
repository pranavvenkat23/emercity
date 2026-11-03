import { router } from 'expo-router';
import { ChatCircleText, Info, MagnifyingGlass } from 'phosphor-react-native';
import { View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Card } from '@/components/card';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

/**
 * PLAN-12 Ask (§18.4). Grounded answers need a server that retrieves passages
 * and checks the model's output. This build runs on the free Firebase plan,
 * which has no Cloud Functions, so Ask is not turned on. The app says so
 * instead of answering from an unchecked model.
 */
export function Ask() {
  const t = useTheme();
  const online = useSession((s) => s.online);
  return (
    <Screen header={<AppBar title="Ask" back />}>
      <Card>
        <View style={{ flexDirection: 'row', gap: t.space.sm, alignItems: 'center' }}>
          <Info size={22} color={t.colors.brandPrimary} />
          <AppText variant="subhead" style={{ flex: 1 }}>
            Answers come from official guides. For emergencies, call 911.
          </AppText>
        </View>
      </Card>
      {online === false ? (
        <EmptyState icon={ChatCircleText} title="Ask needs a connection" message="Try searching guides instead." action={{ label: 'Search guides', onPress: () => router.back() }} />
      ) : (
        <View style={{ gap: t.space.md }}>
          <EmptyState
            icon={ChatCircleText}
            title="Ask isn't turned on yet"
            message="Ask answers only from official guides, checked on a server. That server isn't set up in this version, so Ask can't answer questions."
          />
          <Button label="Search guides" icon={MagnifyingGlass} onPress={() => router.back()} />
          <AppText variant="footnote" secondary>
            For medicine questions, call your pharmacist or doctor. If it's urgent, call 911.
          </AppText>
        </View>
      )}
    </Screen>
  );
}
