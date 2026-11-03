import Constants from 'expo-constants';
import { View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { PLAYBOOK_REVIEW } from '@/reference/playbook-templates';
import { useTheme } from '@/theme/theme';

/** SET-09 disclaimer text, verbatim from spec §22.6. */
export const DISCLAIMER =
  'Emercity helps your household plan for emergencies using public data and established guidance. It is not a substitute for official instructions, emergency services, or medical advice. Always follow orders from local officials and call 911 in an emergency. Medication and device times are estimates; confirm with your pharmacist, doctor, or equipment supplier.';

/** SET-09 About and disclaimer (§22.6). */
export function About() {
  const t = useTheme();
  return (
    <Screen header={<AppBar title="About" back showAvatar={false} sheet />}>
      <Card style={{ borderColor: t.colors.severityUrgent, borderWidth: 1.5 }}>
        <AppText variant="body">{DISCLAIMER}</AppText>
      </Card>
      <Card>
        <View style={{ gap: 6 }}>
          <AppText variant="headline">Priority rules and playbooks</AppText>
          <AppText variant="callout" secondary>
            {PLAYBOOK_REVIEW.reviewed
              ? `Reviewed by ${PLAYBOOK_REVIEW.reviewer} on ${PLAYBOOK_REVIEW.reviewedDate}.`
              : 'Not yet reviewed by a qualified local reviewer (emergency manager, nurse, or CERT instructor). This is a development build and is not ready for real emergency use.'}
          </AppText>
        </View>
      </Card>
      <AppText variant="footnote" secondary>
        Version {Constants.expoConfig?.version ?? 'unknown'} · development build
      </AppText>
    </Screen>
  );
}
