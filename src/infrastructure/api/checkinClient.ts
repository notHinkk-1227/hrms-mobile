import { createTenantClient } from './tenantClient';
import { toApiError } from './errors';
import { getAllowedLocationsForToday } from './employeeClient';
import type { CheckinPort } from '@domain/ports/checkin';
import type {
  AllowedLocation,
  ClockInPayload,
  ClockInResult,
  LogType,
} from '@domain/entities/checkin';

/** Format datetime untuk Frappe (YYYY-MM-DD HH:mm:ss tanpa timezone). */
function toFrappeDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export interface FrappeEmployeeCheckin {
  name: string;
  employee: string;
  log_type: LogType;
  time: string;
  latitude: number | null;
  longitude: number | null;
  device_id: string | null;
}

export async function getLastCheckinToday(employee: string): Promise<FrappeEmployeeCheckin | null> {
  try {
    const client = createTenantClient();
    const today = new Date().toISOString().slice(0, 10);
    const response = await client.get('/api/resource/Employee Checkin', {
      params: {
        filters: JSON.stringify([
          ['employee', '=', employee],
          ['time', '>=', `${today} 00:00:00`],
        ]),
        fields: JSON.stringify(['name', 'employee', 'log_type', 'time', 'latitude', 'longitude', 'device_id']),
        order_by: 'time desc',
        limit_page_length: 1,
      },
    });
    const list: FrappeEmployeeCheckin[] = response.data?.data ?? [];
    return list[0] ?? null;
  } catch (e) {
    throw toApiError(e);
  }
}

async function submitCheckin(payload: ClockInPayload): Promise<ClockInResult> {
  try {
    const client = createTenantClient();
    const body = {
      employee: '',
      log_type: payload.logType,
      time: toFrappeDatetime(payload.clientTimestamp),
      latitude: payload.coordinate.latitude,
      longitude: payload.coordinate.longitude,
      device_id: payload.device.deviceId,
    };
    // Caller MUST set employee before calling — port layer handles this in use case
    if (!('employee' in payload) || !(payload as unknown as { employee: string }).employee) {
      throw new Error('Missing employee in payload');
    }
    body.employee = (payload as unknown as { employee: string }).employee;

    const response = await client.post('/api/resource/Employee Checkin', body);
    const doc = response.data?.data;
    return {
      name: doc?.name ?? '',
      verificationStatus: 'Verified', // standard endpoint tidak punya scoring; default Verified
      verificationScore: 100,
      serverTimestamp: doc?.time ?? new Date().toISOString(),
    };
  } catch (e) {
    throw toApiError(e);
  }
}

export const checkinClient: CheckinPort = {
  async getAllowedLocations(): Promise<AllowedLocation[]> {
    // Caller harus pass employee via wrapper di use case — port interface tidak punya
    // employee param, jadi return [] dan biarkan use case yang panggil employeeClient
    // langsung. Disimpan stub untuk satisfy interface.
    return [];
  },

  async submitClockIn(payload: ClockInPayload): Promise<ClockInResult> {
    return submitCheckin(payload);
  },

  async submitClockOut(payload: ClockInPayload): Promise<ClockInResult> {
    return submitCheckin(payload);
  },
};

/** Helper: panggil getAllowedLocationsForToday — di-export terpisah supaya use case bisa
 * pass employee explicitly. */
export { getAllowedLocationsForToday };
