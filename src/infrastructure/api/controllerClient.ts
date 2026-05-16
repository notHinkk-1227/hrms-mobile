import axios, { AxiosInstance } from 'axios';
import { env } from '@config/env';
import { toApiError } from './errors';

const client: AxiosInstance = axios.create({
  baseURL: env.controllerUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export type ResolveTenantResponse = {
  ok: boolean;
  url?: string;
  tenant_name?: string;
  code?: string;
  message?: string;
};

export async function resolveTenantCode(code: string, deviceId: string): Promise<ResolveTenantResponse> {
  try {
    const response = await client.post('/api/method/sopwer_controller.api.resolve_tenant_code', {
      code,
      device_id: deviceId,
    });
    return response.data?.message ?? response.data;
  } catch (error) {
    // sopwer_controller mengembalikan 404 dengan body {message: {ok:false, code, message}}
    // axios membuang body 4xx ke error.response.data — recover di sini sebagai response negatif
    // ketimbang throw, supaya UI bisa tampilkan pesan dari server.
    const axErr = error as { response?: { status?: number; data?: { message?: ResolveTenantResponse } } };
    const msg = axErr?.response?.data?.message;
    if (axErr?.response?.status === 404 && msg && typeof msg === 'object' && msg.ok === false) {
      return msg;
    }
    throw toApiError(error);
  }
}

export const controllerClient = client;
