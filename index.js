/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Background message handler harus didaftarkan di top-level (di luar React)
// supaya bisa wake JS context saat app tertutup. RNFirebase requirement.
// Dynamic require: kalau native module belum terpasang (build tanpa
// google-services.json), skip pendaftaran tanpa crash.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const messagingMod = require('@react-native-firebase/messaging');
  const messaging = messagingMod.default || messagingMod;
  if (messaging && typeof messaging === 'function') {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('[push] background message:', remoteMessage?.data);
      // Tidak perlu UI update di sini — saat user tap notif,
      // onNotificationOpenedApp / getInitialNotification akan handle deep link.
    });
  }
} catch (e) {
  console.warn('[push] background handler skipped:', String(e));
}

AppRegistry.registerComponent(appName, () => App);
