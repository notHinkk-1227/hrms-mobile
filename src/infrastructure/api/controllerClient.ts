import axios, { AxiosInstance } from 'axios';
import { toApiError } from './errors';

const CONTROLLER_URL = 'https://office.sopwer.id';

const client: AxiosInstance = axios.create({
  baseURL: CONTROLLER_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export type ResolveTenantResponse = {
  ok: boolean;
  url: string;
  tenant_name: string;
  code: string;
};

export async function resolveTenantCode(code: string, deviceId: string): Promise<ResolveTenantResponse> {
  try {
    const response = await client.post('/api/method/sopwer_controller.api.resolve_tenant_code', {
      code,
      device_id: deviceId,
    });
    return response.data?.message ?? response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export const controllerClient = client;
