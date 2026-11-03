import { AlertPrompt } from '@/screens/alerts/alert-prompt';
import { ThemeScope } from '@/theme/theme';

/** ALERT-PROMPT (§10.3). Always dark, like Emergency Mode. */
export default function AlertPromptRoute() {
  return (
    <ThemeScope mode="emergency">
      <AlertPrompt />
    </ThemeScope>
  );
}
