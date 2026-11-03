import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { useOutageSync } from '@/hooks/use-countdowns';
import { useOutageShare } from '@/hooks/use-outage-share';
import { useReminders } from '@/hooks/use-reminders';
import { useAlertHistoryStore, useAlertPolling } from '@/services/alerts';
import { useCloudSync } from '@/services/cloud-sync';
import { useA11y } from '@/stores/a11y-store';
import { useLanguage } from '@/stores/language-store';
import { useSession } from '@/stores/session-store';
import { useRiskProfile } from '@/services/risk-profile';
import { configureNotifications } from '@/services/notifications';

/** Turns an emercity:// deep link (§3.3) into an in-app route path. */
export function deepLinkToPath(url: string): string | null {
  const m = url.match(/^emercity:\/\/(.*)$/);
  if (!m) return null;
  return `/${m[1]}`;
}

/**
 * App-wide background work with no UI: outage persistence and countdown
 * notification scheduling, alert polling (every 5 min while open), notification setup, and opening the right
 * screen when a notification is tapped.
 */
export function AppServices() {
  useOutageSync();
  useOutageShare();
  useReminders();
  useAlertPolling();
  useRiskProfile();
  useCloudSync();

  const db = useSession((s) => s.db);
  useEffect(() => {
    if (db) {
      useA11y.getState().load(db.kv);
      useLanguage.getState().load(db.kv);
    }
  }, [db]);
  const pending = useAlertHistoryStore((s) => s.pending);

  // A new warning that maps to a full-screen prompt opens ALERT-PROMPT once (§10.3).
  useEffect(() => {
    if (pending) router.push('/alert-prompt');
  }, [pending]);

  useEffect(() => {
    configureNotifications().catch(() => {});
    const open = (r: Notifications.NotificationResponse | null) => {
      const url = r?.notification.request.content.data?.url;
      const path = typeof url === 'string' ? deepLinkToPath(url) : null;
      // Typed routes can't know runtime strings; paths come only from our own §3.3 links.
      if (path) router.push(path as never);
    };
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);

  return null;
}
