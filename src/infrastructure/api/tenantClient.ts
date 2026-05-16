import axios, { AxiosInstance } from 'axios';
import { persist, StorageKeys } from '@infrastructure/storage/mmkv';
import { authEvents } from './authEvents';
import { toApiError } from './errors';

export class NotAuthenticatedError extends Error {
  constructor() {
    super('Not authenticated');
    this.name = 'NotAuthenticatedError';
  }
}

export function createTenantClient(): AxiosInstance {
  const tenantUrl = persist.getString(StorageKeys.TENANT_URL);
  const apiKey = persist.getString(StorageKeys.AUTH_API_KEY);
  const apiSecret = persist.getString(StorageKeys.AUTH_API_SECRET);

  if (!tenantUrl) {
    throw new NotAuthenticatedError();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey && apiSecret) {
    headers.Authorization = `token ${apiKey}:${apiSecret}`;
  }

  const client = axios.create({
    baseURL: tenantUrl,
    timeout: 30000,
    headers,
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        authEvents.emitUnauthorized();
      }
      return Promise.reject(toApiError(error));
    },
  );

  return client;
}

/**
 * Tenant client tanpa auth header — dipakai SAAT login awal sebelum punya api_key/secret.
 * Tetap pakai tenantUrl dari MMKV (harus sudah resolved via controller).
 */
export function createPublicTenantClient(): AxiosInstance {
  const tenantUrl = persist.getString(StorageKeys.TENANT_URL);
  if (!tenantUrl) {
    throw new NotAuthenticatedError();
  }
  const client = axios.create({
    baseURL: tenantUrl,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
  });
  client.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(toApiError(error)),
  );
  return client;
}
