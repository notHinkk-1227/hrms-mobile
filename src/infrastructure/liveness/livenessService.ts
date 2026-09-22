import { Skia } from '@shopify/react-native-skia';
import FaceDetection from '@react-native-ml-kit/face-detection';
import { loadTensorflowModel } from 'react-native-fast-tflite';
import type { LivenessPort } from '@domain/ports/liveness';
import type { LivenessSignals } from '@domain/entities/checkin';
import {
  LIVENESS_CROP_SCALE_V2,
  LIVENESS_CROP_SCALE_V1SE,
  LIVENESS_INPUT_SIZE,
  LIVENESS_THRESHOLD,
} from '@config/liveness';

/**
 * Path require() ke model TFLite, hasil konversi Silent-Face-Anti-Spoofing.
 * Sengaja ditaruh di sini (infra layer), BUKAN di config/liveness.ts --
 * config/liveness.ts wajib pure TS supaya bisa diimport domain layer
 * (clockIn.ts import LIVENESS_FAIL_OPEN dari sana) tanpa ikut require()
 * binary asset yang bikin Jest crash.
 */
const LIVENESS_MODEL_V2 = require('@shared/assets/models/anti-spoof-minifasnet-v2.tflite');
const LIVENESS_MODEL_V1SE = require('@shared/assets/models/anti-spoof-minifasnet-v1se.tflite');

/**
 * Bounding box wajah, dinormalisasi ke bentuk {x, y, width, height} dalam
 * pixel koordinat foto asli (bukan koordinat layar).
 *
 * Field asli dari @react-native-ml-kit/face-detection sudah dikonfirmasi di
 * device asli: `frame: {left, top, width, height}`. normalizeFaceBox() di
 * bawah tetap menangani beberapa kemungkinan bentuk lain (bounds/boundingBox,
 * right+bottom) sebagai fallback defensif kalau versi library berubah.
 */
interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type TFLiteModel = Awaited<ReturnType<typeof loadTensorflowModel>>;

let modelV2: TFLiteModel | null = null;
let modelV1se: TFLiteModel | null = null;
let loadingPromise: Promise<void> | null = null;

/** Softmax manual -- model TFLite cuma output raw logits. */
function softmax3(logits: Float32Array): [number, number, number] {
  const max = Math.max(logits[0], logits[1], logits[2]);
  const exp0 = Math.exp(logits[0] - max);
  const exp1 = Math.exp(logits[1] - max);
  const exp2 = Math.exp(logits[2] - max);
  const sum = exp0 + exp1 + exp2;
  return [exp0 / sum, exp1 / sum, exp2 / sum];
}

/**
 * Normalisasi bounding box dari hasil mentah @react-native-ml-kit/face-detection
 * ke bentuk {x, y, width, height}. Format asli sudah dikonfirmasi di device
 * (`frame.{left,top,width,height}`); fallback ke beberapa nama field lain
 * tetap dipertahankan sebagai jaga-jaga kalau versi library berubah.
 */
function normalizeFaceBox(rawFace: unknown): FaceBox | null {
  const face = rawFace as Record<string, any>;
  const box = face?.frame ?? face?.bounds ?? face?.boundingBox ?? face;

  if (!box || typeof box !== 'object') return null;

  const left = box.left ?? box.x ?? box.originX;
  const top = box.top ?? box.y ?? box.originY;
  let width = box.width;
  let height = box.height;

  if (width == null && box.right != null && left != null) {
    width = box.right - left;
  }
  if (height == null && box.bottom != null && top != null) {
    height = box.bottom - top;
  }

  if (left == null || top == null || width == null || height == null) {
    return null;
  }

  return { x: left, y: top, width, height };
}

/**
 * Hitung crop box final dari face box + scale, replikasi persis algoritma
 * _get_new_box() dari repo asli Silent-Face-Anti-Spoofing
 * (src/generate_patches.py) -- termasuk clamping ke batas gambar dengan cara
 * geser (bukan cuma dipotong), supaya hasil crop match dengan cara model
 * dilatih.
 */
function getCropBox(
  srcW: number,
  srcH: number,
  face: FaceBox,
  scale: number,
): { left: number; top: number; right: number; bottom: number } {
  const clampedScale = Math.min((srcH - 1) / face.height, Math.min((srcW - 1) / face.width, scale));

  const newWidth = face.width * clampedScale;
  const newHeight = face.height * clampedScale;
  const centerX = face.width / 2 + face.x;
  const centerY = face.height / 2 + face.y;

  let left = centerX - newWidth / 2;
  let top = centerY - newHeight / 2;
  let right = centerX + newWidth / 2;
  let bottom = centerY + newHeight / 2;

  if (left < 0) {
    right -= left;
    left = 0;
  }
  if (top < 0) {
    bottom -= top;
    top = 0;
  }
  if (right > srcW - 1) {
    left -= right - srcW + 1;
    right = srcW - 1;
  }
  if (bottom > srcH - 1) {
    top -= bottom - srcH + 1;
    bottom = srcH - 1;
  }

  return { left, top, right, bottom };
}

/**
 * Crop + resize foto ke ukuran model (80x80) via Skia, lalu ekstrak raw RGB
 * pixel value dalam range [0, 255] (TIDAK dinormalisasi -- sesuai kode asli
 * Silent-Face-Anti-Spoofing yang menonaktifkan div(255), lihat
 * src/data_io/functional.py baris ~59 di repo asli).
 *
 * Return ArrayBuffer NHWC (1, 80, 80, 3) siap masuk ke model.run().
 */
async function cropAndPreprocess(
  photoPath: string,
  face: FaceBox,
  scale: number,
): Promise<ArrayBuffer | null> {
  const uri = photoPath.startsWith('file://') ? photoPath : `file://${photoPath}`;
  const data = await Skia.Data.fromURI(uri);
  if (!data) return null;

  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) return null;

  const srcW = image.width();
  const srcH = image.height();
  const box = getCropBox(srcW, srcH, face, scale);

  const surface = Skia.Surface.Make(LIVENESS_INPUT_SIZE, LIVENESS_INPUT_SIZE);
  if (!surface) return null;

  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  canvas.drawImageRect(
    image,
    { x: box.left, y: box.top, width: box.right - box.left, height: box.bottom - box.top },
    { x: 0, y: 0, width: LIVENESS_INPUT_SIZE, height: LIVENESS_INPUT_SIZE },
    paint,
  );

  const snapshot = surface.makeImageSnapshot();

  // readPixels() default RGBA_8888 -- kita buang channel alpha, ambil RGB saja.
  const rgba = snapshot.readPixels() as Uint8Array | null;
  if (!rgba) return null;

  const pixelCount = LIVENESS_INPUT_SIZE * LIVENESS_INPUT_SIZE;
  const rgbFloat = new Float32Array(pixelCount * 3);
  for (let i = 0; i < pixelCount; i++) {
    rgbFloat[i * 3 + 0] = rgba[i * 4 + 0]; // R, range 0-255 (tidak dinormalisasi)
    rgbFloat[i * 3 + 1] = rgba[i * 4 + 1]; // G
    rgbFloat[i * 3 + 2] = rgba[i * 4 + 2]; // B
  }

  return rgbFloat.buffer;
}

async function ensureModelsLoaded(): Promise<void> {
  if (modelV2 && modelV1se) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const [v2, v1se] = await Promise.all([
        loadTensorflowModel(LIVENESS_MODEL_V2, []),
        loadTensorflowModel(LIVENESS_MODEL_V1SE, []),
      ]);
      modelV2 = v2;
      modelV1se = v1se;
    } catch {
      // Fail-open: model gagal load (device tidak support, dll) --
      // modelV2/modelV1se tetap null, isReady() akan return false,
      // checkLiveness() akan return verdict 'Unknown'.
      modelV2 = null;
      modelV1se = null;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

function unknownResult(): LivenessSignals {
  // isLive selalu false untuk verdict 'Unknown' -- port ini cuma melapor apa
  // yang terjadi (default aman: tidak diketahui hidup atau tidak). Keputusan
  // fail-open/fail-closed ada di use case (via LIVENESS_FAIL_OPEN di config),
  // BUKAN di sini.
  return { isLive: false, score: 0, verdict: 'Unknown' };
}

function noFaceResult(): LivenessSignals {
  // Beda dari unknownResult(): ini BUKAN kegagalan teknis. ML Kit berhasil
  // jalan dan secara valid melaporkan "tidak ada tepat 1 wajah di frame".
  // Use case akan HARD BLOCK untuk verdict ini (lihat clockIn.ts), bukan
  // fail-open, supaya foto tanpa wajah (langit-langit, tangan, dll) tidak
  // bisa dipakai untuk presensi.
  return { isLive: false, score: 0, verdict: 'NoFace' };
}

export const livenessService: LivenessPort = {
  async preload(): Promise<void> {
    await ensureModelsLoaded();
  },

  isReady(): boolean {
    return modelV2 !== null && modelV1se !== null;
  },

  async checkLiveness(photoPath: string): Promise<LivenessSignals> {
    try {
      await ensureModelsLoaded();
      if (!modelV2 || !modelV1se) {
        return unknownResult();
      }

      const uri = photoPath.startsWith('file://') ? photoPath : `file://${photoPath}`;
      const rawFaces = await FaceDetection.detect(uri);

      // 0 wajah atau >1 wajah -- ML Kit berhasil jalan, ini BUKAN kegagalan
      // teknis, ini sinyal valid bahwa foto tidak bisa dipakai. Hard block
      // (verdict 'NoFace'), BUKAN fail-open seperti 'Unknown'.
      if (!rawFaces || rawFaces.length !== 1) {
        if (__DEV__) {
          console.log(`[livenessService] NoFace -- jumlah wajah terdeteksi: ${rawFaces?.length ?? 0}`);
        }
        return noFaceResult();
      }

      const face = normalizeFaceBox(rawFaces[0]);
      if (!face) {
        // Beda kasus dengan NoFace: di sini ML Kit MENEMUKAN 1 wajah, tapi
        // parsing bounding box-nya yang gagal (kemungkinan besar bug kode
        // kita sendiri, bukan masalah dari foto user) -- fail-open, jangan
        // rugikan user karena bug kita.
        if (__DEV__) {
          console.warn('[livenessService] normalizeFaceBox gagal parse -- fail-open (Unknown)');
        }
        return unknownResult();
      }

      const [inputV2, inputV1se] = await Promise.all([
        cropAndPreprocess(photoPath, face, LIVENESS_CROP_SCALE_V2),
        cropAndPreprocess(photoPath, face, LIVENESS_CROP_SCALE_V1SE),
      ]);

      if (!inputV2 || !inputV1se) {
        return unknownResult();
      }

      const [outV2, outV1se] = await Promise.all([
        modelV2.run([inputV2]),
        modelV1se.run([inputV1se]),
      ]);

      const softmaxV2 = softmax3(new Float32Array(outV2[0]));
      const softmaxV1se = softmax3(new Float32Array(outV1se[0]));

      // Index 1 = kelas "real". Dikonfirmasi dari test.py resmi
      // minivision-ai/Silent-Face-Anti-Spoofing: `label = argmax(prediction);
      // if label == 1: "Real Face" else "Fake Face"`. Sebelumnya kode ini
      // salah pakai index 2, menyebabkan wajah asli SELALU tertolak (skor
      // "real" yang dibaca sebenarnya skor kelas fake lain).
      const score = (softmaxV2[1] + softmaxV1se[1]) / 2;
      const isLive = score >= LIVENESS_THRESHOLD;

      if (__DEV__) {
        console.log(
          `[livenessService] score=${score.toFixed(4)} ` +
            `(v2=[${Array.from(softmaxV2).map((v) => v.toFixed(4))}], ` +
            `v1se=[${Array.from(softmaxV1se).map((v) => v.toFixed(4))}]) ` +
            `threshold=${LIVENESS_THRESHOLD} -> ${isLive ? 'Pass' : 'Fail'}`,
        );
      }

      return {
        isLive,
        score,
        verdict: isLive ? 'Pass' : 'Fail',
      };
    } catch {
      // Tidak pernah throw ke caller -- fail-open, sesuai kontrak LivenessPort.
      return unknownResult();
    }
  },
};