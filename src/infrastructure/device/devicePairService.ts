import DeviceInfo from 'react-native-device-info';
import { createTenantClient } from '@infrastructure/api/tenantClient';
import { persist, StorageKeys } from '@infrastructure/storage/mmkv';

interface PairResult {
  name: string;
  status: 'Active' | 'Pending Approval' | 'Blocked';
  existing: boolean;
}

const PAIR_FLAG_KEY = StorageKeys.AUTH_USER; // marker dipakai untuk skip pair-spam

let lastPairAt = 0;
const PAIR_COOLDOWN_MS = 60 * 60 * 1000; // 1 jam

/**
 * Pair device aktif ke server (enhanced mode). Idempotent — server return
 * existing kalau device_id sudah terdaftar. Skip kalau baru saja pair
 * (cooldown 1 jam, supaya tidak spam tiap app open).
 *
 * Aman dipanggil tanpa cek — error di-swallow (device pair gagal tidak boleh
 * block user dari masuk app).
 */
export async function pairDeviceQuiet(appVersion?: string): Promise<PairResult | null> {
  const now = Date.now();
  if (now - lastPairAt < PAIR_COOLDOWN_MS) {
    return null; // cooldown — anggap sudah pair
  }
  try {
    const [deviceId, deviceName, osVersion] = await Promise.all([
      DeviceInfo.getUniqueId(),
      DeviceInfo.getDeviceName(),
      Promise.resolve(`${DeviceInfo.getSystemName()} ${DeviceInfo.getSystemVersion()}`),
    ]);
    const client = createTenantClient();
    const res = await client.post('/api/method/sopwer_hrms.api.mobile.pair_device', {
      device_id: deviceId,
      device_name: deviceName,
      os_version: osVersion,
      app_version: appVersion ?? DeviceInfo.getVersion(),
    });
    const msg = res.data?.message ?? {};
    lastPairAt = now;
    return {
      name: msg.name,
      status: msg.status,
      existing: !!msg.existing,
    };
  } catch {
    // Standard mode (404), network error, atau permission denied → silent
    return null;
  }
}

/** Untuk Debug Screen — paksa fresh pair regardless cooldown. */
export async function pairDeviceForce(appVersion?: string): Promise<PairResult | null> {
  lastPairAt = 0;
  return pairDeviceQuiet(appVersion);
}

export function readLastUser(): string | null {
  return persist.getString(PAIR_FLAG_KEY) ?? null;
}
