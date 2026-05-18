/**
 * Push notification service — wrapper di atas @react-native-firebase/messaging.
 *
 * Backend: shared app `sopwer_push` (di Frappe), pakai firebase-admin Python
 * langsung ke FCM HTTP v1 (tidak pakai Frappe Cloud relay). Mobile register
 * token via `sopwer_push.api.register_token` dengan app_id="hadir-by-sopwer".
 *
 * Flow:
 * 1. App start (post-login) → `requestPermission()` minta POST_NOTIFICATIONS
 *    (Android 13+). Auto granted di Android <=12.
 * 2. Setelah granted → `getToken()` dapat FCM token.
 * 3. POST `/api/method/sopwer_push.api.register_token` dengan fcm_token +
 *    app_id + device info.
 * 4. POST `/api/method/sopwer_hrms.api.push.subscribe_default_topics` —
 *    auto-subscribe broadcast topic `hadir_by_sopwer_all_<site>`.
 * 5. Listen `onTokenRefresh` — re-POST kalau token rotate.
 *
 * Fail-soft: kalau Firebase native module belum dipasang (mis. build tanpa
 * google-services.json), semua method return false / null tanpa crash.
 * Mobile tetap jalan, cuma push tidak aktif.
 */
import { Platform, PermissionsAndroid } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { persist, StorageKeys } from '@infrastructure/storage/mmkv';
import { createTenantClient } from '@infrastructure/api/tenantClient';

export const APP_ID = 'hadir-by-sopwer';

async function safeDeviceName(): Promise<string | undefined> {
  try {
    return await DeviceInfo.getModel();
  } catch {
    return undefined;
  }
}

async function safeOsVersion(): Promise<string | undefined> {
  try {
    const system = DeviceInfo.getSystemName();
    const version = DeviceInfo.getSystemVersion();
    return `${system} ${version}`;
  } catch {
    return undefined;
  }
}

async function safeAppVersion(): Promise<string | undefined> {
  try {
    return DeviceInfo.getVersion();
  } catch {
    return undefined;
  }
}

// Dynamic require supaya build tetap jalan kalau library belum di-link
// (mis. pas dev tanpa google-services.json). Native module akan throw saat
// dipanggil, kita catch + return null.
let _messaging: any | null | undefined;
function getMessaging(): any | null {
  if (_messaging !== undefined) {
    return _messaging;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-firebase/messaging');
    _messaging = mod.default || mod;
  } catch (e) {
    console.warn('[push] @react-native-firebase/messaging not available:', String(e));
    _messaging = null;
  }
  return _messaging;
}

export interface PushRegistrationResult {
  registered: boolean;
  token: string | null;
  reason?: string;
}

class PushServiceImpl {
  /** True kalau Firebase native module ter-link + bisa dipakai. */
  isAvailable(): boolean {
    return !!getMessaging();
  }

  /** Request notification permission. Return true kalau granted. */
  async requestPermission(): Promise<boolean> {
    const messaging = getMessaging();
    if (!messaging) return false;
    try {
      // Android 13+ butuh POST_NOTIFICATIONS runtime permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }
      }
      // RN Firebase requestPermission (iOS-focused tapi safe di Android — return AUTHORIZED)
      const authStatus = await messaging().requestPermission();
      // AuthorizationStatus.AUTHORIZED = 1, PROVISIONAL = 2
      return authStatus === 1 || authStatus === 2;
    } catch (e) {
      console.warn('[push] requestPermission error:', String(e));
      return false;
    }
  }

  /** Dapat FCM token. Null kalau gagal / module tidak tersedia. */
  async getToken(): Promise<string | null> {
    const messaging = getMessaging();
    if (!messaging) return null;
    try {
      const token = await messaging().getToken();
      return token || null;
    } catch (e) {
      console.warn('[push] getToken error:', String(e));
      return null;
    }
  }

  /**
   * Register FCM token ke backend.
   * - POST `/api/method/frappe.push_notification.subscribe` dengan fcm_token
   *   + project_name.
   * - POST `/api/method/sopwer_hrms.api.push.subscribe_default_topics` untuk
   *   auto-subscribe broadcast topic.
   *
   * Cached: kalau token + site sama dengan yang tersimpan, skip re-register.
   */
  async registerToken(force = false): Promise<PushRegistrationResult> {
    if (!this.isAvailable()) {
      return { registered: false, token: null, reason: 'unavailable' };
    }
    const permitted = await this.requestPermission();
    if (!permitted) {
      return { registered: false, token: null, reason: 'no_permission' };
    }
    const token = await this.getToken();
    if (!token) {
      return { registered: false, token: null, reason: 'no_token' };
    }
    const tenantUrl = persist.getString(StorageKeys.TENANT_URL) || '';
    const cachedToken = persist.getString(StorageKeys.FCM_TOKEN);
    const cachedSite = persist.getString(StorageKeys.FCM_REGISTERED_SITE);
    if (!force && cachedToken === token && cachedSite === tenantUrl) {
      return { registered: true, token, reason: 'cached' };
    }
    try {
      const client = createTenantClient();
      const deviceName = await safeDeviceName();
      const osVersion = await safeOsVersion();
      const appVersion = await safeAppVersion();
      await client.post(
        '/api/method/sopwer_push.api.register_token',
        {
          fcm_token: token,
          app_id: APP_ID,
          device_name: deviceName,
          os_version: osVersion,
          app_version: appVersion,
        },
        { timeout: 8000 },
      );
      // Auto subscribe ke broadcast topic. Best-effort — kalau gagal, kita
      // tetap considered registered (user masih dapat user-targeted notif).
      try {
        await client.post(
          '/api/method/sopwer_hrms.api.push.subscribe_default_topics',
          {},
          { timeout: 8000 },
        );
      } catch (e) {
        console.warn('[push] subscribe_default_topics failed:', String(e));
      }
      persist.setString(StorageKeys.FCM_TOKEN, token);
      persist.setString(StorageKeys.FCM_REGISTERED_SITE, tenantUrl);
      persist.setNumber(StorageKeys.FCM_REGISTERED_AT, Date.now());
      return { registered: true, token };
    } catch (e) {
      console.warn('[push] register_token failed:', String(e));
      return { registered: false, token, reason: 'register_failed' };
    }
  }

  /** Unregister FCM token saat logout. Best-effort. */
  async unregisterToken(): Promise<void> {
    const cachedToken = persist.getString(StorageKeys.FCM_TOKEN);
    if (!cachedToken) return;
    try {
      const client = createTenantClient();
      await client.post(
        '/api/method/sopwer_push.api.unregister_token',
        { fcm_token: cachedToken, app_id: APP_ID },
        { timeout: 5000 },
      );
    } catch (e) {
      console.warn('[push] unregister failed:', String(e));
    } finally {
      persist.delete(StorageKeys.FCM_TOKEN);
      persist.delete(StorageKeys.FCM_REGISTERED_SITE);
      persist.delete(StorageKeys.FCM_REGISTERED_AT);
    }
  }

  /** Subscribe listener token refresh — re-register kalau FCM rotate. */
  onTokenRefresh(callback: (token: string) => void): () => void {
    const messaging = getMessaging();
    if (!messaging) return () => undefined;
    try {
      return messaging().onTokenRefresh(callback);
    } catch (e) {
      console.warn('[push] onTokenRefresh subscribe failed:', String(e));
      return () => undefined;
    }
  }

  /** Foreground message handler. Return unsubscribe. */
  onMessage(callback: (remoteMessage: any) => void): () => void {
    const messaging = getMessaging();
    if (!messaging) return () => undefined;
    try {
      return messaging().onMessage(callback);
    } catch (e) {
      console.warn('[push] onMessage subscribe failed:', String(e));
      return () => undefined;
    }
  }

  /** App opened from background tap. */
  onNotificationOpenedApp(
    callback: (remoteMessage: any) => void,
  ): () => void {
    const messaging = getMessaging();
    if (!messaging) return () => undefined;
    try {
      return messaging().onNotificationOpenedApp(callback);
    } catch (e) {
      console.warn('[push] onNotificationOpenedApp subscribe failed:', String(e));
      return () => undefined;
    }
  }

  /** App opened from terminated state tap. Return null kalau bukan dari tap. */
  async getInitialNotification(): Promise<any | null> {
    const messaging = getMessaging();
    if (!messaging) return null;
    try {
      return await messaging().getInitialNotification();
    } catch (e) {
      console.warn('[push] getInitialNotification error:', String(e));
      return null;
    }
  }
}

export const pushService = new PushServiceImpl();
