/**
 * Domain entities untuk Employee Checkin — pure TypeScript.
 *
 * Bentuk data yang mengalir dari mobile → use case → infrastructure → API.
 */

export type LogType = 'IN' | 'OUT';

export type VerificationStatus = 'Verified' | 'Suspicious' | 'Flagged';

export type PlayIntegrityVerdict = 'Pass' | 'Fail' | 'Unknown';

export interface Coordinate {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export interface AllowedLocation {
  name: string;
  locationName?: string;
  latitude: number;
  longitude: number;
  radiusM: number;
}

export interface IntegritySignals {
  isMockLocation: boolean;
  isRootedDevice: boolean;
  playIntegrityVerdict: PlayIntegrityVerdict;
}

export interface DeviceInfo {
  deviceId: string;
  deviceFingerprint: string;
}

/** Payload yang dikirim ke server saat clock-in. */
export interface ClockInPayload {
  logType: LogType;
  coordinate: Coordinate;
  integrity: IntegritySignals;
  device: DeviceInfo;
  selfieBase64: string;
  clientTimestamp: string; // ISO 8601
  clientUuid: string;
  /** Alasan kalau di luar radius geofence — wajib di enhanced mode soft-block. */
  reasonOutsideLocation?: string;
  /** Employee ID — caller wajib isi (use case level). */
  employee?: string;
}

/** Response dari server setelah clock-in sukses (server-authoritative). */
export interface ClockInResult {
  name: string; // Employee Checkin doc name
  verificationStatus: VerificationStatus;
  verificationScore: number;
  serverTimestamp: string; // ISO 8601
  locationName?: string;
  message?: string;
}

/** Outcome dari ClockInUseCase — sukses, ditolak (out of geofence), atau queued. */
export type ClockInOutcome =
  | { kind: 'success'; result: ClockInResult }
  | { kind: 'out_of_geofence'; nearest?: { name: string; distanceM: number } }
  | { kind: 'queued'; clientUuid: string } // disimpan ke offline queue
  | { kind: 'error'; message: string };
