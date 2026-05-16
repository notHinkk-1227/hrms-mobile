import { create } from 'zustand';
import { persist, StorageKeys } from '@infrastructure/storage/mmkv';
import type { Employee } from '@domain/entities/employee';

export interface TenantInfo {
  code: string;
  url: string;
  name: string;
}

export interface LoginPayload {
  user: string;
  apiKey: string;
  apiSecret: string;
  employee: Employee;
}

interface AuthState {
  hydrated: boolean;
  isAuthenticated: boolean;
  tenantCode: string | null;
  tenantUrl: string | null;
  tenantName: string | null;
  tenantResolvedAt: number | null;
  user: string | null;
  apiKey: string | null;
  apiSecret: string | null;
  employee: Employee | null;
  onboardingSeen: boolean;
  privacyAccepted: boolean;

  hydrate: () => void;
  setTenant: (info: TenantInfo) => void;
  clearTenant: () => void;
  login: (payload: LoginPayload) => void;
  logout: () => void;
  markOnboardingSeen: () => void;
  acceptPrivacy: () => void;
}

const TENANT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  isAuthenticated: false,
  tenantCode: null,
  tenantUrl: null,
  tenantName: null,
  tenantResolvedAt: null,
  user: null,
  apiKey: null,
  apiSecret: null,
  employee: null,
  onboardingSeen: false,
  privacyAccepted: false,

  hydrate: () => {
    const tenantUrl = persist.getString(StorageKeys.TENANT_URL) ?? null;
    const tenantName = persist.getString(StorageKeys.TENANT_NAME) ?? null;
    const tenantCode = persist.getString(StorageKeys.TENANT_CODE) ?? null;
    const tenantResolvedAt = persist.getNumber(StorageKeys.TENANT_RESOLVED_AT) ?? null;
    const apiKey = persist.getString(StorageKeys.AUTH_API_KEY) ?? null;
    const apiSecret = persist.getString(StorageKeys.AUTH_API_SECRET) ?? null;
    const user = persist.getString(StorageKeys.AUTH_USER) ?? null;
    const employee = persist.getObject<Employee>(StorageKeys.EMPLOYEE_PROFILE) ?? null;
    const onboardingSeen = persist.getBoolean(StorageKeys.ONBOARDING_SEEN) ?? false;
    const privacyAccepted = persist.getBoolean(StorageKeys.PRIVACY_ACCEPTED) ?? false;

    const isAuthenticated = Boolean(tenantUrl && apiKey && apiSecret && employee);

    set({
      hydrated: true,
      isAuthenticated,
      tenantUrl,
      tenantName,
      tenantCode,
      tenantResolvedAt,
      apiKey,
      apiSecret,
      user,
      employee,
      onboardingSeen,
      privacyAccepted,
    });
  },

  setTenant: ({ code, url, name }) => {
    const resolvedAt = Date.now();
    persist.setString(StorageKeys.TENANT_CODE, code);
    persist.setString(StorageKeys.TENANT_URL, url);
    persist.setString(StorageKeys.TENANT_NAME, name);
    persist.setNumber(StorageKeys.TENANT_RESOLVED_AT, resolvedAt);
    set({
      tenantCode: code,
      tenantUrl: url,
      tenantName: name,
      tenantResolvedAt: resolvedAt,
    });
  },

  clearTenant: () => {
    persist.delete(StorageKeys.TENANT_CODE);
    persist.delete(StorageKeys.TENANT_URL);
    persist.delete(StorageKeys.TENANT_NAME);
    persist.delete(StorageKeys.TENANT_RESOLVED_AT);
    set({
      tenantCode: null,
      tenantUrl: null,
      tenantName: null,
      tenantResolvedAt: null,
    });
  },

  login: ({ user, apiKey, apiSecret, employee }) => {
    persist.setString(StorageKeys.AUTH_API_KEY, apiKey);
    persist.setString(StorageKeys.AUTH_API_SECRET, apiSecret);
    persist.setString(StorageKeys.AUTH_USER, user);
    persist.setObject(StorageKeys.EMPLOYEE_PROFILE, employee);
    persist.setNumber(StorageKeys.LAST_LOGIN_AT, Date.now());
    persist.delete(StorageKeys.LOGIN_FAILED_ATTEMPTS);
    persist.delete(StorageKeys.LOGIN_LOCK_UNTIL);
    set({
      isAuthenticated: true,
      user,
      apiKey,
      apiSecret,
      employee,
    });
  },

  logout: () => {
    const { tenantCode, tenantUrl, tenantName, tenantResolvedAt, onboardingSeen } = get();
    persist.clearAll();
    if (tenantCode && tenantUrl && tenantName && tenantResolvedAt) {
      persist.setString(StorageKeys.TENANT_CODE, tenantCode);
      persist.setString(StorageKeys.TENANT_URL, tenantUrl);
      persist.setString(StorageKeys.TENANT_NAME, tenantName);
      persist.setNumber(StorageKeys.TENANT_RESOLVED_AT, tenantResolvedAt);
    }
    if (onboardingSeen) {
      persist.setBoolean(StorageKeys.ONBOARDING_SEEN, true);
    }
    set({
      isAuthenticated: false,
      user: null,
      apiKey: null,
      apiSecret: null,
      employee: null,
      privacyAccepted: false,
    });
  },

  markOnboardingSeen: () => {
    persist.setBoolean(StorageKeys.ONBOARDING_SEEN, true);
    set({ onboardingSeen: true });
  },

  acceptPrivacy: () => {
    persist.setBoolean(StorageKeys.PRIVACY_ACCEPTED, true);
    set({ privacyAccepted: true });
  },
}));

export function isTenantCacheFresh(resolvedAt: number | null): boolean {
  if (!resolvedAt) {
    return false;
  }
  return Date.now() - resolvedAt < TENANT_TTL_MS;
}
