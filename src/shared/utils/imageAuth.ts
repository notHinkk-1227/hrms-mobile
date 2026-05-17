import { persist, StorageKeys } from '@infrastructure/storage/mmkv';

export interface AuthImageSource {
  uri: string;
  headers?: Record<string, string>;
}

/**
 * Build Image source dengan Authorization header dari API key/secret yang
 * disimpan di MMKV. Wajib untuk file Frappe `/private/files/...` yang butuh
 * auth — tag `<Image>` RN support optional `headers` di source.
 *
 * Kalau path sudah full URL (http/https), pakai as-is. Kalau relative, prepend
 * tenant URL.
 */
export function getAuthImageSource(filePath: string | null | undefined): AuthImageSource | null {
  if (!filePath) return null;
  const tenantUrl = persist.getString(StorageKeys.TENANT_URL) ?? '';
  const isAbsolute = filePath.startsWith('http://') || filePath.startsWith('https://');
  const uri = isAbsolute
    ? filePath
    : tenantUrl
    ? tenantUrl.replace(/\/$/, '') + filePath
    : filePath;

  const apiKey = persist.getString(StorageKeys.AUTH_API_KEY);
  const apiSecret = persist.getString(StorageKeys.AUTH_API_SECRET);
  const headers =
    apiKey && apiSecret ? { Authorization: `token ${apiKey}:${apiSecret}` } : undefined;

  return { uri, headers };
}
