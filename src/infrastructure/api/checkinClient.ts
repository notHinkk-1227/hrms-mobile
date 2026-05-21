import { createTenantClient } from './tenantClient';
import { toApiError } from './errors';
import { getAllowedLocationsForToday } from './employeeClient';
import { useFeaturesStore } from './featureDetect';
import { hasSent, markSent } from '@infrastructure/persistence/sentUuids';
import type { CheckinPort } from '@domain/ports/checkin';
import type {
  AllowedLocation,
  ClockInPayload,
  ClockInResult,
  LogType,
  VerificationStatus,
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
  shift?: string | null;
  employee_name?: string | null;
}

export interface CheckinAttachment {
  name: string;
  file_name: string;
  file_url: string;
  is_image: 0 | 1;
  is_private: 0 | 1;
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i;

function isImageFile(name: string | null | undefined, url: string | null | undefined): 0 | 1 {
  if (name && IMAGE_EXT.test(name)) return 1;
  if (url && IMAGE_EXT.test(url.split('?')[0] ?? '')) return 1;
  return 0;
}

export async function listCheckinHistory(
  employee: string,
  limit = 50,
): Promise<FrappeEmployeeCheckin[]> {
  try {
    const client = createTenantClient();
    const response = await client.get('/api/resource/Employee Checkin', {
      params: {
        filters: JSON.stringify([['employee', '=', employee]]),
        fields: JSON.stringify([
          'name',
          'employee',
          'log_type',
          'time',
          'latitude',
          'longitude',
          'device_id',
        ]),
        order_by: 'time desc',
        limit_page_length: limit,
      },
    });
    return response.data?.data ?? [];
  } catch (e) {
    throw toApiError(e);
  }
}

export async function getCheckin(name: string): Promise<FrappeEmployeeCheckin | null> {
  try {
    const client = createTenantClient();
    const response = await client.get(
      `/api/resource/Employee Checkin/${encodeURIComponent(name)}`,
      {
        params: {
          fields: JSON.stringify([
            'name',
            'employee',
            'employee_name',
            'log_type',
            'time',
            'latitude',
            'longitude',
            'device_id',
            'shift',
          ]),
        },
      },
    );
    return (response.data?.data as FrappeEmployeeCheckin | null) ?? null;
  } catch (e) {
    throw toApiError(e);
  }
}

interface RawDocinfoAttachment {
  name?: string;
  file_name?: string | null;
  file_url?: string | null;
  is_private?: 0 | 1 | boolean;
  is_image?: 0 | 1 | boolean;
}

export async function listCheckinAttachments(name: string): Promise<CheckinAttachment[]> {
  try {
    const client = createTenantClient();
    // Pakai get_docinfo — endpoint resmi Frappe Desk untuk fetch attachments.
    // Permission dicek lewat parent doc (Employee Checkin), bukan File doctype,
    // jadi private files (is_private=1) ikut keluar selama user bisa baca docnya.
    // /api/resource/File langsung sering kosong karena role Employee tidak punya
    // read perm di File doctype.
    const response = await client.get('/api/method/frappe.desk.form.load.get_docinfo', {
      params: {
        doctype: 'Employee Checkin',
        name,
      },
    });
    const raw: RawDocinfoAttachment[] =
      response.data?.message?.docinfo?.attachments ?? response.data?.docinfo?.attachments ?? [];
    return raw
      .filter((a): a is RawDocinfoAttachment & { name: string; file_url: string } =>
        Boolean(a?.name && a?.file_url),
      )
      .map((a) => ({
        name: a.name,
        file_name: a.file_name ?? a.file_url.split('/').pop() ?? a.name,
        file_url: a.file_url,
        is_image:
          a.is_image === 1 || a.is_image === true ? 1 : isImageFile(a.file_name, a.file_url),
        is_private: a.is_private === 1 || a.is_private === true ? 1 : 0,
      }));
  } catch (e) {
    throw toApiError(e);
  }
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

async function submitCheckinStandard(payload: ClockInPayload, logType: LogType): Promise<ClockInResult> {
  try {
    const client = createTenantClient();
    if (!payload.employee) throw new Error('Missing employee in payload');
    // client_uuid dikirim sebagai pass-through; Frappe Employee Checkin vanilla
    // tidak punya field ini, server abaikan. Dedup dilakukan client-side via
    // infrastructure/persistence/sentUuids sebelum sampai ke fungsi ini.
    const body = {
      employee: payload.employee,
      log_type: logType,
      time: toFrappeDatetime(payload.clientTimestamp),
      latitude: payload.coordinate.latitude,
      longitude: payload.coordinate.longitude,
      device_id: payload.device.deviceId,
      client_uuid: payload.clientUuid,
    };

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

/**
 * Vanilla mode helper: tulis "alasan di luar lokasi" sebagai Frappe Comment di
 * Employee Checkin record. Comment muncul di timeline doc untuk audit HR.
 * Pakai pattern Frappe standar — tidak perlu Custom Field di vanilla site.
 */
export async function addReasonComment(checkinName: string, reason: string): Promise<void> {
  if (!checkinName || !reason?.trim()) return;
  try {
    const client = createTenantClient();
    await client.post('/api/method/frappe.client.insert', {
      doc: {
        doctype: 'Comment',
        comment_type: 'Info',
        reference_doctype: 'Employee Checkin',
        reference_name: checkinName,
        content: `Alasan di luar lokasi: ${reason.trim()}`,
      },
    });
  } catch (e) {
    // Non-fatal: checkin sudah landed; reason cuma audit trail.
    // Caller decide apakah mau retry / surface ke user.
    throw toApiError(e);
  }
}

/**
 * Enhanced submit — POST ke sopwer_hrms.api.mobile.clock_in/clock_out.
 * Server full validation: geofence soft-block, device binding, scoring, selfie save.
 */
async function submitCheckinEnhanced(payload: ClockInPayload, logType: LogType): Promise<ClockInResult> {
  try {
    const client = createTenantClient();
    const body = {
      payload: {
        device_id: payload.device.deviceId,
        device_fingerprint: payload.device.deviceFingerprint,
        latitude: payload.coordinate.latitude,
        longitude: payload.coordinate.longitude,
        accuracy_meters: payload.coordinate.accuracyMeters,
        is_mock_location: payload.integrity.isMockLocation,
        is_rooted_device: payload.integrity.isRootedDevice,
        play_integrity_verdict: payload.integrity.playIntegrityVerdict,
        selfie_base64: payload.selfieBase64,
        reason_outside_location: payload.reasonOutsideLocation ?? null,
        client_uuid: payload.clientUuid,
        client_timestamp: toFrappeDatetime(payload.clientTimestamp),
      },
    };
    const url =
      logType === 'IN'
        ? '/api/method/sopwer_hrms.api.mobile.clock_in'
        : '/api/method/sopwer_hrms.api.mobile.clock_out';
    const response = await client.post(url, body);
    const msg = response.data?.message ?? {};
    return {
      name: msg.name ?? '',
      verificationStatus: (msg.verification_status as VerificationStatus) ?? 'Verified',
      verificationScore: msg.verification_score ?? 0,
      serverTimestamp: msg.time ?? new Date().toISOString(),
      message: msg.verification_notes ?? undefined,
    };
  } catch (e) {
    throw toApiError(e);
  }
}

/** Sentinel error: dipakai supaya caller (use case) tahu ini dedup, bukan
 * network error. Use case bisa interpret as success no-op. */
export class AlreadySentError extends Error {
  constructor(public readonly clientUuid: string) {
    super(`Client UUID ${clientUuid} sudah pernah dikirim (dedup)`);
    this.name = 'AlreadySentError';
  }
}

async function submitCheckin(payload: ClockInPayload, logType: LogType): Promise<ClockInResult> {
  // Mobile-side dedup. Vanilla mode: Frappe abaikan field client_uuid; kita
  // gatekeep di sini supaya retry network/outbox tidak duplicate POST.
  if (payload.clientUuid && hasSent(payload.clientUuid)) {
    throw new AlreadySentError(payload.clientUuid);
  }
  const features = useFeaturesStore.getState().features;
  const result = features.hasSopwerHrms
    ? await submitCheckinEnhanced(payload, logType)
    : await submitCheckinStandard(payload, logType);
  if (payload.clientUuid) markSent(payload.clientUuid);
  return result;
}

export const checkinClient: CheckinPort = {
  async getAllowedLocations(): Promise<AllowedLocation[]> {
    // Caller harus pass employee via wrapper di use case — port interface tidak punya
    // employee param, jadi return [] dan biarkan use case yang panggil employeeClient
    // langsung. Disimpan stub untuk satisfy interface.
    return [];
  },

  async submitClockIn(payload: ClockInPayload): Promise<ClockInResult> {
    return submitCheckin(payload, 'IN');
  },

  async submitClockOut(payload: ClockInPayload): Promise<ClockInResult> {
    return submitCheckin(payload, 'OUT');
  },
};

/** Helper: panggil getAllowedLocationsForToday — di-export terpisah supaya use case bisa
 * pass employee explicitly. */
export { getAllowedLocationsForToday };
