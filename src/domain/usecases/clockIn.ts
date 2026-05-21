import type { LocationPort } from '@domain/ports/location';
import type { CheckinPort } from '@domain/ports/checkin';
import type {
  AllowedLocation,
  ClockInOutcome,
  ClockInPayload,
  Coordinate,
  LogType,
} from '@domain/entities/checkin';

/** Generate client UUID untuk idempotency. Bukan crypto-grade — cukup untuk
 * mobile-side dedup vanilla mode (collision prob effectively zero per device). */
function generateClientUuid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Haversine distance in meters — duplikat utility supaya domain tidak depend on
 * infrastructure. Pure math. */
function haversineMeters(p1: Coordinate, p2: { latitude: number; longitude: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6_371_008.8;
  const dLat = toRad(p2.latitude - p1.latitude);
  const dLon = toRad(p2.longitude - p1.longitude);
  const lat1 = toRad(p1.latitude);
  const lat2 = toRad(p2.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export interface NearestLocation {
  name: string;
  locationName?: string;
  distanceM: number;
  inside: boolean;
}

export function findNearest(
  point: Coordinate,
  allowed: AllowedLocation[],
): NearestLocation | null {
  if (allowed.length === 0) return null;
  let nearest: NearestLocation | null = null;
  for (const loc of allowed) {
    const d = haversineMeters(point, loc);
    if (!nearest || d < nearest.distanceM) {
      nearest = {
        name: loc.name,
        locationName: loc.locationName,
        distanceM: d,
        inside: d <= loc.radiusM,
      };
    }
  }
  return nearest;
}

export interface ClockInUseCaseDeps {
  locationPort: LocationPort;
  checkinPort: CheckinPort;
  /** Async function untuk fetch allowed locations untuk employee tertentu.
   * Decoupled dari CheckinPort karena standard REST butuh employee param. */
  fetchAllowedLocations: (employee: string) => Promise<AllowedLocation[]>;
}

export interface ClockInUseCaseInput {
  logType: LogType;
  employee: string;
  deviceId: string;
  deviceFingerprint: string;
  /** Kalau true, paksa submit meskipun di luar geofence. Default false. */
  overrideOutOfGeofence?: boolean;
  /** Alasan kalau di luar geofence — wajib di enhanced mode soft-block. */
  reasonOutsideLocation?: string;
  /** Selfie base64 (data: URI atau pure base64). */
  selfieBase64?: string;
  integrity?: Partial<ClockInPayload['integrity']>;
  /** Opsional: caller bisa supply UUID dari outbox/retry context. Kalau kosong,
   * use case generate baru. */
  clientUuid?: string;
}

export interface ClockInPreview {
  coordinate: Coordinate;
  nearest: NearestLocation | null;
  allowedLocations: AllowedLocation[];
}

export class ClockInUseCase {
  constructor(private deps: ClockInUseCaseDeps) {}

  /** Step 1: get current location + nearest allowed (untuk preview di ConfirmScreen). */
  async preview(employee: string): Promise<ClockInPreview> {
    const granted = await this.deps.locationPort.requestPermission();
    if (!granted) {
      throw new Error('GPS permission denied');
    }
    const coordinate = await this.deps.locationPort.getCurrentPosition();
    const allowedLocations = await this.deps.fetchAllowedLocations(employee);
    const nearest = findNearest(coordinate, allowedLocations);
    return { coordinate, nearest, allowedLocations };
  }

  /** Step 2: setelah user konfirmasi, submit ke server. */
  async submit(input: ClockInUseCaseInput, preview: ClockInPreview): Promise<ClockInOutcome> {
    if (preview.nearest && !preview.nearest.inside && !input.overrideOutOfGeofence) {
      return {
        kind: 'out_of_geofence',
        nearest: {
          name: preview.nearest.locationName ?? preview.nearest.name,
          distanceM: preview.nearest.distanceM,
        },
      };
    }

    const payload: ClockInPayload & { employee: string } = {
      employee: input.employee,
      logType: input.logType,
      coordinate: preview.coordinate,
      integrity: {
        isMockLocation: input.integrity?.isMockLocation ?? false,
        isRootedDevice: input.integrity?.isRootedDevice ?? false,
        playIntegrityVerdict: input.integrity?.playIntegrityVerdict ?? 'Unknown',
      },
      device: {
        deviceId: input.deviceId,
        deviceFingerprint: input.deviceFingerprint,
      },
      selfieBase64: input.selfieBase64 ?? '',
      clientTimestamp: new Date().toISOString(),
      clientUuid: input.clientUuid ?? generateClientUuid(),
      reasonOutsideLocation: input.reasonOutsideLocation,
    };

    try {
      const result =
        input.logType === 'IN'
          ? await this.deps.checkinPort.submitClockIn(payload)
          : await this.deps.checkinPort.submitClockOut(payload);
      return { kind: 'success', result };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gagal mengirim presensi';
      return { kind: 'error', message };
    }
  }
}
