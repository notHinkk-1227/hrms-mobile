# scripts/

Dev tooling — bukan bagian dari app runtime (tidak di-bundle Metro).

## `analyze_liveness_calibration.py`

Analisis FAR/FRR dari data kalibrasi anti-spoofing yang diekspor
`LivenessCalibrationScreen` (Debug → "Kalibrasi Threshold Anti-Spoofing").

Butuh Python 3, tanpa dependency eksternal (stdlib saja).

```bash
python3 scripts/analyze_liveness_calibration.py path/ke/samples.json
```

Lihat docstring di dalam file untuk detail definisi FAR/FRR dan cara baca
outputnya. Data sample (`samples.json`) berisi skor numerik hasil model
per foto — **bukan** foto/gambar itu sendiri, tapi tetap jangan di-commit ke
repo (lihat `.gitignore` — folder `scripts/data/` diabaikan git, taruh
export di situ kalau mau simpan lokal).