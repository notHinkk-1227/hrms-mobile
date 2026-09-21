/**
 * Domain entities untuk Employee Checkin — pure TypeScript.
 *
 * Bentuk data yang mengalir dari mobile → use case → infrastructure → API.
 */

export type LogType = 'IN' | 'OUT';

export type VerificationStatus = 'Verified' | 'Suspicious' | 'Flagged';

export type PlayIntegrityVerdict = 'Pass' | 'Fail' | 'Unknown';

/**
 * Hasil deteksi anti-spoofing wajah (Silent-Face-Anti-Spoofing / MiniFASNet
 * ensemble, on-device).
 *
 * - 'Pass': wajah asli terverifikasi, lolos.
 * - 'Fail': wajah terdeteksi tapi model menilai ini spoof (foto cetak/layar
 *   HP lain) -- hard block, wajib retake.
 * - 'NoFace': ML Kit berhasil jalan TAPI tidak menemukan tepat 1 wajah di
 *   frame (0 wajah, atau >1 wajah). Ini BUKAN kegagalan teknis -- model
 *   berhasil memberi jawaban yang valid: foto ini tidak bisa dipakai. Hard
 *   block, wajib retake, dengan pesan berbeda dari 'Fail'.
 * - 'Unknown': kegagalan TEKNIS (model gagal load, device tidak support,
 *   crop/inference error). Fail-open -- jangan blokir karyawan gara-gara
 *   bug/keterbatasan device, lihat LIVENESS_FAIL_OPEN di config/liveness.ts.
 */
export type LivenessVerdict = 'Pass' | 'Fail' | 'NoFace' | 'Unknown';

export interface LivenessSignals {
  /** True kalau skor akhir >= threshold yang dipakai saat itu. */
  isLive: boolean;
  /** Rata-rata skor "real" dari ensemble 2 model, range 0-1. */
  score: number;
  verdict: LivenessVerdict;
}

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
  /**
   * Opsional supaya backward compatible -- kalau LivenessPort gagal total
   * (device tidak support, model gagal load), field ini boleh kosong dan
   * checkin tetap bisa lanjut (fail-open, ditandai untuk review manual via
   * verificationStatus di server nanti).
   */
  faceLiveness?: LivenessSignals;
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
  | { kind: 'spoof_detected'; liveness: LivenessSignals } // foto terdeteksi bukan asli
  | { kind: 'queued'; clientUuid: string } // disimpan ke offline queue
  | { kind: 'error'; message: string };