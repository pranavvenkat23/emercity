import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Bell, Camera, CheckCircle, MapPin, type Icon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SetupFrame } from '@/components/setup-frame';
import { AppText } from '@/components/text';
import { notificationsEnabled, requestNotificationPermission } from '@/services/notifications';
import { useTheme } from '@/theme/theme';

type State = 'unknown' | 'granted' | 'denied' | 'later';

/** ONB-11 Permissions, one per card, asked in context (§5.11). */
export function PermissionsStep() {
  const [notif, setNotif] = useState<State>('unknown');
  const [loc, setLoc] = useState<State>('unknown');
  const [cam, setCam] = useState<State>('unknown');
  const [camPerm, requestCam] = useCameraPermissions();

  useEffect(() => {
    notificationsEnabled().then((ok) => ok && setNotif('granted'));
    Location.getForegroundPermissionsAsync().then((p) => p.granted && setLoc('granted'));
  }, []);
  useEffect(() => {
    if (camPerm?.granted) setCam('granted');
  }, [camPerm]);

  return (
    <SetupFrame stage="Ready" title="Stay in the loop" subtitle="Allow what helps. You can change these later in Settings." primary={{ label: 'Next', onPress: () => router.push('/done') }}>
      <PermissionCard
        icon={Bell}
        title="Notifications"
        benefit="Get warned when an alert hits your address."
        ifDenied="Alerts will only show inside the app."
        state={notif}
        onAllow={async () => setNotif((await requestNotificationPermission()) ? 'granted' : 'denied')}
        onLater={() => setNotif('later')}
      />
      <PermissionCard
        icon={MapPin}
        title="Location"
        benefit="Find the nearest open shelter and check alerts where you are."
        ifDenied="Emercity will use your home address only."
        state={loc}
        onAllow={async () => setLoc((await Location.requestForegroundPermissionsAsync()).granted ? 'granted' : 'denied')}
        onLater={() => setLoc('later')}
      />
      <PermissionCard
        icon={Camera}
        title="Camera"
        benefit="Scan medication barcodes."
        ifDenied="You can type medicines in instead."
        state={cam}
        onAllow={async () => setCam((await requestCam()).granted ? 'granted' : 'denied')}
        onLater={() => setCam('later')}
      />
    </SetupFrame>
  );
}

function PermissionCard({ icon: IconCmp, title, benefit, ifDenied, state, onAllow, onLater }: { icon: Icon; title: string; benefit: string; ifDenied: string; state: State; onAllow: () => void; onLater: () => void }) {
  const t = useTheme();
  return (
    <Card>
      <View style={{ gap: t.space.xs }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <IconCmp size={26} color={t.colors.brandAccent} />
          <AppText variant="headline" style={{ flex: 1 }}>
            {title}
          </AppText>
          {state === 'granted' ? <CheckCircle size={24} color={t.colors.statusSafe} weight="fill" /> : null}
        </View>
        <AppText variant="body">{benefit}</AppText>
        {state === 'granted' ? (
          <AppText variant="subhead" secondary>
            Allowed
          </AppText>
        ) : state === 'denied' || state === 'later' ? (
          <AppText variant="subhead" secondary>
            {ifDenied}
          </AppText>
        ) : (
          <View style={{ flexDirection: 'row', gap: t.space.sm }}>
            <Button style={{ flex: 1 }} label="Allow" onPress={onAllow} />
            <Button style={{ flex: 1 }} label="Not now" variant="secondary" onPress={onLater} />
          </View>
        )}
      </View>
    </Card>
  );
}
