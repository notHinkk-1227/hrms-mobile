/**
 * Konfigurasi fitur anti-spoofing wajah (liveness detection).
 *
 * PENTING -- file ini WAJIB pure TS (tidak boleh ada `require()` aset RN
 * seperti model .tflite): domain layer (`domain/usecases/clockIn.ts`) import
 * `LIVENESS_FAIL_OPEN` dari sini. Kalau file ini ikut require() binary asset,
 * Jest akan crash saat parsing file .tflite sebagai JS (sudah diverifikasi
 * langsung -- lihat CHANGELOG/PR terkait). Path model TFLite ada di
 * `infrastructure/liveness/livenessService.ts` sendiri, bukan di sini.
 *
 * Threshold di sini adalah nilai AWAL, bukan final -- WAJIB dikalibrasi ulang
 * di Fase 7 berdasarkan testing matriks nyata (wajah asli vs foto cetak vs
 * foto/video di layar HP), lihat catatan FAR/FRR di rencana implementasi.
 */

/**
 * Crop scale per model -- BUKAN pilihan bebas, ini bagian dari desain
 * ensemble asli. Jangan diubah tanpa training ulang model.
 */
export const LIVENESS_CROP_SCALE_V2 = 2.7;
export const LIVENESS_CROP_SCALE_V1SE = 4.0;

/** Ukuran input yang diharapkan kedua model (persegi). */
export const LIVENESS_INPUT_SIZE = 80;

/**
 * Threshold skor "real" (0-1) untuk isLive = true.
 *
 * DIKALIBRASI dari data nyata (150 sampel awal + 60 sampel susulan dengan
 * jarak capture terkontrol, lihat scripts/analyze_liveness_calibration.py):
 *   - threshold=0.75 -> FAR gabungan 21.1%, FRR 10%
 *   - FAR terpisah per jenis serangan: print=0% (SANGAT baik), screen=40%
 *
 * *** KNOWN LIMITATION -- BELUM DIPECAHKAN, SENGAJA DITERIMA SEMENTARA ***
 * Model ini (Silent-Face-Anti-Spoofing / MiniFASNet) TERBUKTI LEMAH
 * terhadap serangan replay foto/video di layar HP/tablet ("screen attack").
 * Menaikkan threshold TIDAK banyak membantu -- FAR screen tetap di kisaran
 * 30-45% bahkan di threshold 0.80-0.85, sementara FRR wajah asli mulai naik
 * signifikan (15-35%). Threshold BUKAN solusi untuk celah ini; masalahnya
 * ada di kemampuan model itu sendiri membedakan tekstur/moiré layar.
 * Mitigasi tambahan (di luar scope threshold ini) masih perlu dibahas --
 * lihat diskusi kalibrasi untuk detail data & opsi mitigasi yang
 * dipertimbangkan (mis. deteksi moiré/refleksi terpisah, sinyal device
 * tambahan). Threshold 0.75 dipilih sebagai kompromi SEMENTARA yang
 * menjaga FRR tetap rendah (10%) dan FAR print tetap 0%, sambil celah
 * screen-attack ini didokumentasikan secara sadar, bukan diabaikan.
 */
export const LIVENESS_THRESHOLD = 0.75;

/**
 * Kebijakan saat LivenessPort gagal total (model tidak load, device tidak
 * support, dll) -- fail-open supaya tidak ada karyawan yang tidak bisa
 * check-in gara-gara bug teknis / device lama. Verdict 'Unknown' akan
 * ditandai untuk review manual via verificationStatus di server nanti
 * (enhanced mode), bukan otomatis lolos tanpa jejak.
 *
 * Dipakai langsung oleh ClockInUseCase.submit() -- ubah nilai ini untuk
 * switch ke fail-closed (verdict 'Unknown' ikut hard block).
 */
export const LIVENESS_FAIL_OPEN = true;

/**
 * Master switch untuk enforcement anti-spoofing.
 *
 * - `true` (default): perilaku normal -- verdict 'Fail'/'NoFace' hard block
 *   check-in (lihat ClockInUseCase.submit()).
 * - `false`: MODE LOG-ONLY. faceLiveness tetap dihitung dan tetap dikirim
 *   ke server di payload (data tetap terkumpul untuk analisis), TAPI tidak
 *   pernah memblokir check-in apa pun hasilnya. Dipakai untuk rollout
 *   bertahap: aktifkan dulu di mode ini ke sebagian/semua karyawan selama
 *   beberapa minggu, kumpulkan distribusi skor dari kondisi lapangan nyata,
 *   baru nyalakan enforcement (`true`) setelah threshold final dikalibrasi
 *   dengan percaya diri.
 *
 * PENTING: ini flag kode (perlu rebuild+release untuk ubah), BUKAN remote
 * config server. Untuk v1 ini cukup -- kalau nanti butuh ubah tanpa rilis
 * ulang (mis. mau langsung nyalakan enforcement ke semua device tanpa
 * publish app baru), pertimbangkan pindah ke backend feature-flag (lihat
 * pola `useFeaturesStore`/`hasSopwerHrms` yang sudah ada di project ini).
 */
export const LIVENESS_ENFORCEMENT_ENABLED = true;