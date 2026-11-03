import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

import { useSession } from '@/stores/session-store';

/** Opens a cited source (§1.4 "Honest data") in the in-app browser. */
export async function openSource(url: string): Promise<void> {
  if (useSession.getState().online === false) {
    Alert.alert('No connection', `This source needs the internet. The address is:\n${url}`);
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    Alert.alert('Could not open the source', url);
  }
}
