import { create } from 'zustand';
import { createTenantClient } from './tenantClient';
import { persist, StorageKeys } from '@infrastructure/storage/mmkv';

export interface BackendFeatures {
  /** True kalau backend punya sopwer_hrms (ping OK). False = vanilla Frappe HR. */
  hasSopwerHrms: boolean;
  version: string | null;
  // Feature flags
  geofence: boolean;
  selfieRequired: boolean;
  antiTamper: boolean;
  timeWindow: boolean;
  deviceBinding: boolean;
  scoring: boolean;
  // Config
  geofenceDefaultRadiusM: number;
  shiftTimeGraceMin: number;
  autoPairFirstDevice: boolean;
  softBlockOutsideGeofence: boolean;
}

export const STANDARD_MODE: BackendFeatures = {
  hasSopwerHrms: false,
  version: null,
  geofence: false,
  selfieRequired: false,
  antiTamper: false,
  timeWindow: false,
  deviceBinding: false,
  scoring: false,
  geofenceDefaultRadiusM: 100,
  shiftTimeGraceMin: 15,
  autoPairFirstDevice: false,
  softBlockOutsideGeofence: false,
};

interface CacheEntry {
  at: number;
  data: BackendFeatures;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface PingResponse {
  app: string;
  version: string;
  features: {
    geofence?: boolean;
    selfie_required?: boolean;
    anti_tamper?: boolean;
    time_window?: boolean;
    device_binding?: boolean;
    scoring?: boolean;
  };
  config: {
    geofence_default_radius_m?: number;
    shift_time_grace_min?: number;
    auto_pair_first_device?: boolean;
    soft_block_outside_geofence?: boolean;
  };
}

function fromPing(raw: PingResponse): BackendFeatures {
  const f = raw.features ?? {};
  const c = raw.config ?? {};
  return {
    hasSopwerHrms: true,
    version: raw.version ?? null,
    geofence: !!f.geofence,
    selfieRequired: !!f.selfie_required,
    antiTamper: !!f.anti_tamper,
    timeWindow: !!f.time_window,
    deviceBinding: !!f.device_binding,
    scoring: !!f.scoring,
    geofenceDefaultRadiusM: c.geofence_default_radius_m ?? 100,
    shiftTimeGraceMin: c.shift_time_grace_min ?? 15,
    autoPairFirstDevice: c.auto_pair_first_device ?? false,
    softBlockOutsideGeofence: c.soft_block_outside_geofence ?? false,
  };
}

/**
 * Ping backend untuk detect sopwer_hrms. Cache MMKV 1 jam.
 * Kalau 404/network error → STANDARD_MODE (mobile pakai Frappe HR REST).
 */
export async function detectBackendFeatures(force = false): Promise<BackendFeatures> {
  if (!force) {
    const cached = persist.getObject<CacheEntry>(StorageKeys.BACKEND_FEATURES);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.data;
    }
  }
  try {
    const client = createTenantClient();
    const res = await client.get<{ message: PingResponse }>(
      '/api/method/sopwer_hrms.api.health.ping',
      { timeout: 5000 },
    );
    const data = fromPing(res.data.message);
    persist.setObject<CacheEntry>(StorageKeys.BACKEND_FEATURES, {
      at: Date.now(),
      data,
    });
    return data;
  } catch {
    // 404 / network / timeout → standard mode (Frappe HR bawaan)
    const data = { ...STANDARD_MODE };
    persist.setObject<CacheEntry>(StorageKeys.BACKEND_FEATURES, {
      at: Date.now(),
      data,
    });
    return data;
  }
}

// === Zustand store ===

interface FeaturesState {
  features: BackendFeatures;
  loaded: boolean;
  refresh: (force?: boolean) => Promise<void>;
  hydrate: () => void;
}

export const useFeaturesStore = create<FeaturesState>((set) => ({
  features: STANDARD_MODE,
  loaded: false,
  refresh: async (force = false) => {
    const data = await detectBackendFeatures(force);
    set({ features: data, loaded: true });
  },
  hydrate: () => {
    const cached = persist.getObject<CacheEntry>(StorageKeys.BACKEND_FEATURES);
    if (cached) {
      set({ features: cached.data, loaded: true });
    }
  },
}));
