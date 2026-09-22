import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({
  id: 'sopwer-hrms-default',
  // TODO(v2): derive encryption key from Android Keystore (hardware-backed)
  encryptionKey: 'sopwer-hrms-dev-key',
});

export const StorageKeys = {
  AUTH_API_KEY: 'auth.api_key',
  AUTH_API_SECRET: 'auth.api_secret',
  AUTH_USER: 'auth.user',
  TENANT_URL: 'tenant.url',
  TENANT_NAME: 'tenant.name',
  TENANT_CODE: 'tenant.code',
  TENANT_RESOLVED_AT: 'tenant.resolved_at',
  EMPLOYEE_PROFILE: 'employee.profile',
  CHECKIN_QUEUE: 'sync.checkin_queue',
  PRIVACY_ACCEPTED: 'privacy.accepted',
  LAST_LOGIN_AT: 'session.last_login_at',
  ONBOARDING_SEEN: 'onboarding.seen',
  LOGIN_LOCK_UNTIL: 'auth.login_lock_until',
  LOGIN_FAILED_ATTEMPTS: 'auth.login_failed_attempts',
  BIOMETRIC_ENABLED: 'auth.biometric_enabled',
  BIOMETRIC_SESSION: 'auth.biometric_session',
  LANGUAGE: 'i18n.language',
  THEME: 'ui.theme',
  BACKEND_FEATURES: 'features.backend',
  INBOX_READ: 'inbox.read',
  FCM_TOKEN: 'push.fcm_token',
  FCM_REGISTERED_AT: 'push.fcm_registered_at',
  FCM_REGISTERED_SITE: 'push.fcm_registered_site',
  SENT_UUIDS: 'sync.sent_uuids',
  LIVENESS_CALIBRATION_SAMPLES: 'liveness.calibration_samples',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

export const persist = {
  getString(key: StorageKey): string | undefined {
    return storage.getString(key);
  },

  setString(key: StorageKey, value: string): void {
    storage.set(key, value);
  },

  getNumber(key: StorageKey): number | undefined {
    return storage.getNumber(key);
  },

  setNumber(key: StorageKey, value: number): void {
    storage.set(key, value);
  },

  getBoolean(key: StorageKey): boolean | undefined {
    return storage.getBoolean(key);
  },

  setBoolean(key: StorageKey, value: boolean): void {
    storage.set(key, value);
  },

  getObject<T>(key: StorageKey): T | undefined {
    const raw = storage.getString(key);
    if (!raw) {
      return undefined;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  },

  setObject<T>(key: StorageKey, value: T): void {
    storage.set(key, JSON.stringify(value));
  },

  delete(key: StorageKey): void {
    storage.remove(key);
  },

  clearAll(): void {
    storage.clearAll();
  },
};