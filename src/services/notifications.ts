import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { deliveryTime, type NoteCategory } from '@/domain/notification-prefs';

import { currentPrefs } from './notification-prefs';

/**
 * Local notifications (§23). Payloads never include names, conditions or
 * medicines (§22.4). Priority mapping (§23):
 *  - critical/urgent to iOS time-sensitive, Android high-importance channel
 *  - normal to standard
 *  - low to passive
 * iOS Critical Alerts (break through silent mode) need an Apple entitlement
 * that has not been granted, so time-sensitive is the highest level used.
 */

export type NotePriority = 'critical' | 'urgent' | 'important' | 'normal' | 'low';

const CHANNEL: Record<NotePriority, string> = {
  critical: 'emercity-critical',
  urgent: 'emercity-urgent',
  important: 'emercity-normal',
  normal: 'emercity-normal',
  low: 'emercity-low',
};

let configured = false;

export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL.critical, {
      name: 'Critical emergency alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL.urgent, {
      name: 'Urgent emergency updates',
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL.normal, {
      name: 'Reminders and updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL.low, {
      name: 'Low-priority reminders',
      importance: Notifications.AndroidImportance.LOW,
    });
  }
}

export async function notificationsEnabled(): Promise<boolean> {
  const p = await Notifications.getPermissionsAsync();
  return p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const p = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return p.granted;
}

export interface LocalNote {
  id: string;
  at: string;
  title: string;
  body: string;
  priority: NotePriority;
  url: string;
}

/**
 * Replaces every scheduled notification whose id starts with `prefix`
 * (e.g. "outage:") with `notes`. Countdowns are pre-scheduled so they
 * still fire if the app is killed or the phone has no signal (§11.7, §25.4).
 */
export async function replaceScheduled(prefix: string, category: NoteCategory, notes: LocalNote[]): Promise<void> {
  const prefs = await currentPrefs();
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing.filter((n) => n.identifier.startsWith(prefix)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  const now = Date.now();
  for (const n of notes) {
    const at = deliveryTime(prefs, category, new Date(n.at));
    if (!at) continue;
    const when = at.getTime();
    if (when <= now) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${prefix}${n.id}`,
      content: {
        title: n.title,
        body: n.body,
        data: { url: n.url },
        sound: n.priority === 'low' ? undefined : 'default',
        interruptionLevel: n.priority === 'critical' || n.priority === 'urgent' ? 'timeSensitive' : n.priority === 'low' ? 'passive' : 'active',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(when), channelId: CHANNEL[n.priority] },
    });
  }
}

/** Shows a notification now (e.g. "Send a test alert", SET-03). */
export async function notifyNow(n: Omit<LocalNote, 'at' | 'id'>): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: n.title,
      body: n.body,
      data: { url: n.url },
      interruptionLevel: n.priority === 'critical' || n.priority === 'urgent' ? 'timeSensitive' : 'active',
    },
    trigger: null,
  });
}
