/**
 * Implementasi LivenessPort yang memanggil SERVER, bukan model on-device.
 * Fase 2 dari docs/LIVENESS_SERVER_MIGRATION_PRD.md.
 *
 * *** DEV ONLY *** -- base URL default ke localhost, ditembus lewat
 * `adb reverse tcp:8000 tcp:8000` (lihat README di liveness-server-local/,
 * hasil Fase 1). BELUM ada mekanisme switch berbasis env/build config --
 * itu sengaja di luar scope Fase 2 (lihat §3 Non-Tujuan PRD: baru dipikirkan
 * lagi kalau lanjut ke Fase 4/5).
 *
 * TIDAK MENGUBAH livenessService.ts (implementasi lokal, on-device) sama
 * sekali -- keduanya hidup berdampingan sesuai §6 PRD. Untuk switch balik ke
 * model lokal: ganti import `livenessService` di ClockInCameraScreen.tsx
 * dari file ini kembali ke '@infrastructure/liveness/livenessService'.
 *
 * Kontrak response server (lihat §5 PRD) sengaja dibuat identik dengan
 * LivenessSignals, jadi tidak perlu mapping/transform di sini.
 */
import type { LivenessPort } from '@domain/ports/liveness';
import type { LivenessSignals, LivenessVerdict } from '@domain/entities/checkin';

/** Ganti IP ini kalau server dev tidak jalan di localhost (mis. testing via
 * WiFi/LAN, bukan adb reverse USB). */
const LIVENESS_SERVER_URL = 'http://localhost:8000';

const HEALTH_CHECK_TIMEOUT_MS = 3_000;
const VERIFY_TIMEOUT_MS = 15_000;

const VALID_VERDICTS: readonly LivenessVerdict[] = ['Pass', 'Fail', 'NoFace', 'Unknown'];

interface VerifyLivenessResponse {
  verdict: LivenessVerdict;
  score: number;
  isLive: boolean;
}

function isVerifyLivenessResponse(value: unknown): value is VerifyLivenessResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.verdict === 'string' &&
    (VALID_VERDICTS as string[]).includes(v.verdict) &&
    typeof v.score === 'number' &&
    typeof v.isLive === 'boolean'
  );
}

/** Read file path -> data URI base64 string. Pakai fetch + FileReader (no
 * native dep) -- pola yang sama persis dipakai di ClockInConfirmScreen.tsx
 * untuk keperluan lain (kirim selfie ke backend Frappe). Sengaja
 * diduplikasi kecil di sini alih-alih extract ke shared util, supaya Fase 2
 * ini tidak menyentuh file lain sama sekali (lihat §3 Non-Tujuan PRD). */
async function fileToBase64(path: string): Promise<string> {
  const uri = path.startsWith('file://') ? path : `file://${path}`;
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('Hasil baca file bukan string'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Gagal baca foto selfie'));
    reader.readAsDataURL(blob);
  });
}

/** Strip prefix 'data:image/jpeg;base64,' -- server cuma mau base64 murni,
 * sesuai kontrak §5 PRD (field `selfie_base64`). */
function stripDataUriPrefix(dataUri: string): string {
  const idx = dataUri.indexOf(',');
  return idx >= 0 ? dataUri.slice(idx + 1) : dataUri;
}

function unknownResult(): LivenessSignals {
  // Fail-open, sama seperti livenessService.ts lokal -- port ini TIDAK
  // PERNAH throw, kegagalan jaringan/timeout/response tak terduga semua
  // dilaporkan sebagai verdict 'Unknown'.
  return { isLive: false, score: 0, verdict: 'Unknown' };
}

/** Dipakai isReady() -- bukan bagian kritikal (ClockInCameraScreen saat ini
 * tidak membaca isReady(), cuma preload() & checkLiveness()), tapi tetap
 * diisi dengan makna yang jujur (server kejangkau atau tidak), bukan
 * hardcode true. */
let serverReachable = false;

export const remoteLivenessService: LivenessPort = {
  async preload(): Promise<void> {
    // Beda makna dari versi lokal (yang preload = load model ke memori).
    // Di sini dipakai sebagai health-check dini, supaya kalau server dev
    // belum jalan / adb reverse belum di-setup, ketahuan dari log saat app
    // dibuka -- bukan baru ketahuan pas user capture foto.
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
      const res = await fetch(`${LIVENESS_SERVER_URL}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      serverReachable = res.ok;
      if (__DEV__ && !res.ok) {
        console.warn(`[remoteLivenessService] /health HTTP ${res.status}`);
      }
    } catch (e) {
      serverReachable = false;
      if (__DEV__) {
        console.warn(
          '[remoteLivenessService] Server liveness tidak terjangkau -- ' +
            'pastikan sudah jalankan adb reverse tcp:8000 tcp:8000 dan server jalan ' +
            `(uvicorn app:app --port 8000). Detail: ${String(e)}`,
        );
      }
    }
  },

  isReady(): boolean {
    return serverReachable;
  },

  async checkLiveness(photoPath: string): Promise<LivenessSignals> {
    try {
      const dataUri = await fileToBase64(photoPath);
      const selfieBase64 = stripDataUriPrefix(dataUri);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(`${LIVENESS_SERVER_URL}/verify-liveness`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selfie_base64: selfieBase64 }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok) {
        if (__DEV__) console.warn(`[remoteLivenessService] HTTP ${res.status}`);
        return unknownResult();
      }

      const json: unknown = await res.json();
      if (!isVerifyLivenessResponse(json)) {
        if (__DEV__) console.warn('[remoteLivenessService] Response shape tak terduga:', json);
        return unknownResult();
      }

      if (__DEV__) {
        console.log(`[remoteLivenessService] score=${json.score.toFixed(4)} verdict=${json.verdict}`);
      }

      return { isLive: json.isLive, score: json.score, verdict: json.verdict };
    } catch (e) {
      // Timeout (AbortError), network error, file read gagal, dll --
      // fail-open, sesuai kontrak LivenessPort. TIDAK PERNAH throw ke caller.
      if (__DEV__) {
        console.warn('[remoteLivenessService] checkLiveness gagal:', e);
      }
      return unknownResult();
    }
  },
};