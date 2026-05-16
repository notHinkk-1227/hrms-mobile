/**
 * Port: Camera service untuk selfie capture. Implementasi via
 * react-native-vision-camera di infrastructure/camera.
 */

export interface CapturedSelfie {
  /** Path file lokal hasil capture (untuk preview / cleanup). */
  filePath: string;
  /** Compressed base64 string siap kirim ke server (target ≤200KB). */
  base64: string;
  /** Bytes size after compression. */
  sizeBytes: number;
  mime: 'image/jpeg' | 'image/png';
}

export interface CameraPort {
  requestPermission(): Promise<boolean>;
  hasPermission(): Promise<boolean>;

  /**
   * Open camera UI, return captured selfie compressed.
   * Caller bertanggung jawab delete file lokal setelah upload sukses.
   */
  captureSelfie(options?: { targetBytes?: number; maxBytes?: number }): Promise<CapturedSelfie>;
}
