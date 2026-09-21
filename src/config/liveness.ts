/**
 * Konfigurasi fitur anti-spoofing wajah (liveness detection).
 *
 * Threshold di sini adalah nilai AWAL, bukan final -- WAJIB dikalibrasi ulang
 * di Fase 7 berdasarkan testing matriks nyata (wajah asli vs foto cetak vs
 * foto/video di layar HP), lihat catatan FAR/FRR di rencana implementasi.
 */

/** Path require() ke model TFLite, hasil konversi Silent-Face-Anti-Spoofing. */
export const LIVENESS_MODEL_V2 = require('@shared/assets/models/anti-spoof-minifasnet-v2.tflite');
export const LIVENESS_MODEL_V1SE = require('@shared/assets/models/anti-spoof-minifasnet-v1se.tflite');

/**
 * Crop scale per model -- BUKAN pilihan bebas, ini bagian dari desain
 * ensemble asli. Jangan diubah tanpa training ulang model.
 */
export const LIVENESS_CROP_SCALE_V2 = 2.7;
export const LIVENESS_CROP_SCALE_V1SE = 4.0;

/** Ukuran input yang diharapkan kedua model (persegi). */
export const LIVENESS_INPUT_SIZE = 80;

/**
 * Threshold skor "real" (0-1) untuk isLive = true. Nilai awal 0.70 --
 * DIKALIBRASI ULANG di Fase 7, jangan anggap final.
 */
export const LIVENESS_THRESHOLD = 0.7;

/**
 * Kebijakan saat LivenessPort gagal total (model tidak load, device tidak
 * support, dll) -- fail-open supaya tidak ada karyawan yang tidak bisa
 * check-in gara-gara bug teknis / device lama. Verdict 'Unknown' akan
 * ditandai untuk review manual via verificationStatus di server nanti
 * (enhanced mode), bukan otomatis lolos tanpa jejak.
 */
export const LIVENESS_FAIL_OPEN = true;
