# Model Anti-Spoofing (Silent-Face-Anti-Spoofing, Apache-2.0)

Hasil konversi PyTorch → ONNX → TFLite, sudah divalidasi numerik identik
dengan model asli (lihat riwayat konversi/validasi di luar repo ini).

## ⚠️ WAJIB dibaca sebelum dipakai di kode (Fase 3+)

| File | Crop scale wajah | Peran |
|---|---|---|
| `anti-spoof-minifasnet-v2.tflite` | **2.7x** dari bbox wajah | Model 1 dari ensemble |
| `anti-spoof-minifasnet-v1se.tflite` | **4.0x** dari bbox wajah | Model 2 dari ensemble |

"Crop scale" artinya: dari bounding box wajah hasil face detection, area yang
di-crop untuk dikirim ke tiap model **berbeda lebar cakupannya** (2.7x vs 4.0x
lebar/tinggi bbox asli, dengan wajah tetap di tengah). Ini bagian dari desain
ensemble asli — bukan pilihan bebas, harus dipertahankan supaya akurasi model
sesuai hasil training aslinya.

## Spesifikasi teknis

- Input: `(1, 80, 80, 3)` — **NHWC**, channel **RGB** (bukan BGR).
- Output: `(1, 3)` — raw logits. **Kelas "real" ada di index 1** (dikonfirmasi
  dari `test.py` resmi repo asli: `label = argmax(prediction); if label == 1:
  "Real Face"`) — BUKAN index 2 seperti asumsi awal kami (sempat salah
  diimplementasikan, sudah diperbaiki). Terapkan **softmax manual** di kode
  (model tidak include softmax layer).
- Preprocessing pixel value (normalisasi 0-1 vs 0-255) **belum divalidasi**
  dengan foto asli — wajib dicek ulang saat testing di device (Fase 7)
  sebelum kalibrasi threshold final.

## Cara pakai (ringkasan alur, detail di domain/infrastructure layer)

```
1. Ambil foto (sudah ada, ClockInCameraScreen.takePhoto())
2. Deteksi wajah -> dapat bounding box (@react-native-ml-kit/face-detection)
3. Crop foto 2 kali dengan scale berbeda (2.7x untuk v2, 4.0x untuk v1se)
4. Resize tiap crop ke 80x80
5. Jalankan kedua model (react-native-fast-tflite)
6. softmax(output) masing-masing, ambil index [1] (kelas "real")
7. final_score = rata-rata dari kedua skor "real"
8. isLive = final_score >= threshold (default 0.70, dikalibrasi di Fase 7)
```