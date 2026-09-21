/**
 * Port: Face anti-spoofing (liveness) detection. Implementasi via
 * react-native-fast-tflite (ensemble MiniFASNet dari Silent-Face-Anti-Spoofing)
 * + @react-native-ml-kit/face-detection untuk crop wajah, di
 * infrastructure/liveness.
 *
 * Prinsip sama seperti IntegrityPort: TIDAK PERNAH throw. Kegagalan apa pun
 * (model belum siap, device tidak support, wajah tidak/ganda terdeteksi)
 * menghasilkan verdict 'Unknown', bukan exception. Keputusan fail-open vs
 * fail-closed ada di level use case (ClockInUseCase), bukan di sini --
 * port ini cuma melapor apa yang terjadi.
 */

import type { LivenessSignals } from '@domain/entities/checkin';

export interface LivenessPort {
  /**
   * Preload kedua model TFLite (ensemble) sekali di awal, mis. saat
   * ClockInCameraScreen mount, supaya checkLiveness() saat capture foto
   * tidak menunggu proses loading model (~beberapa ratus ms). Aman dipanggil
   * berkali-kali -- no-op kalau sudah/sedang loading.
   */
  preload(): Promise<void>;

  /** True kalau kedua model sudah siap dipakai (hasil preload sukses). */
  isReady(): boolean;

  /**
   * Jalankan deteksi anti-spoofing pada 1 foto hasil capture (selfie).
   *
   * Alur: deteksi wajah (ML Kit) -> kalau 0 atau >1 wajah, verdict 'Unknown'
   * -> crop 2x dengan scale berbeda (2.7x & 4.0x, sesuai desain ensemble
   * asli) -> jalankan kedua model TFLite -> rata-rata skor "real" ->
   * bandingkan ke threshold.
   *
   * @param photoPath Path file lokal hasil CameraPort.captureSelfie().
   */
  checkLiveness(photoPath: string): Promise<LivenessSignals>;
}
