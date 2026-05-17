import axios, { AxiosInstance } from 'axios';
import { env } from '@config/env';
import { APP_ID } from '@config/appInfo';
import { toApiError } from './errors';

const client: AxiosInstance = axios.create({
  baseURL: env.controllerUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Error codes dari sopwer_controller — sumber kebenaran:
 * `apps/sopwer_controller/sopwer_controller/api.py` ERR_* constants (2026-05-16).
 *
 * Setiap code mapping ke (HTTP status, RESULT log entry). UI mobile pakai
 * `code` untuk pilih pesan Indonesian yang tepat, bukan parse `message`
 * mentah dari server.
 */
export type ResolveErrorCode =
  | 'missing_parameter'
  | 'invalid_code'
  | 'disabled'
  | 'expired'
  | 'app_not_allowed'
  | 'quota_exceeded'
  | 'device_revoked'
  | 'server_error';

export type ResolveTenantResponse = {
  ok: boolean;
  /** Sukses: URL ERPNext target tenant. */
  url?: string;
  /** Sukses: nama tenant untuk display. */
  tenant_name?: string;
  /** Sukses optional: Tenant Code yang ter-normalize (uppercase). */
  code?: string;
  /** Error: code spesifik dari controller (lihat ResolveErrorCode). */
  error_code?: ResolveErrorCode;
  /** Error: pesan generic dari server (informasi minimal, tidak untuk display langsung). */
  message?: string;
};

/**
 * Resolve Tenant Code via sopwer_controller.
 *
 * Body: `{code, device_id, app}` — `app` dari `APP_ID` constant di appInfo.
 * Response sukses HTTP 200, response error HTTP 400/403/404/500 dengan
 * body `{ok:false, code, message}`. Frappe wraps semua di `{message: ...}`.
 */
export async function resolveTenantCode(
  code: string,
  deviceId: string,
): Promise<ResolveTenantResponse> {
  try {
    const response = await client.post(
      '/api/method/sopwer_controller.api.resolve_tenant_code',
      {
        code,
        device_id: deviceId,
        app: APP_ID,
      },
    );
    const body = response.data?.message ?? response.data;
    return normalizeResponse(body);
  } catch (error) {
    // Controller balikin 400/403/404/500 dengan body bermakna saat error.
    // Recover di sini ketimbang throw, supaya UI tetap dapat `code` spesifik.
    const axErr = error as {
      response?: { status?: number; data?: { message?: unknown } };
    };
    const status = axErr?.response?.status;
    const body = axErr?.response?.data?.message;
    if (
      status &&
      status >= 400 &&
      status < 600 &&
      body &&
      typeof body === 'object' &&
      (body as { ok?: boolean }).ok === false
    ) {
      return normalizeResponse(body);
    }
    throw toApiError(error);
  }
}

function normalizeResponse(raw: unknown): ResolveTenantResponse {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error_code: 'server_error', message: 'Invalid response' };
  }
  const r = raw as {
    ok?: boolean;
    url?: string;
    tenant_name?: string;
    code?: string;
    message?: string;
  };
  if (r.ok === true) {
    return {
      ok: true,
      url: r.url,
      tenant_name: r.tenant_name,
      // Catatan: server tidak include `code` di sukses; kita biarkan undefined
      // dan caller pakai input code-nya sendiri.
    };
  }
  // Error path: `code` di body server = error code (bukan tenant code).
  return {
    ok: false,
    error_code: (r.code as ResolveErrorCode | undefined) ?? 'server_error',
    message: r.message,
  };
}

export const controllerClient = client;
