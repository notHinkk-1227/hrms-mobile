#!/usr/bin/env python3
"""
Analisis kalibrasi threshold anti-spoofing dari data yang diekspor
LivenessCalibrationScreen (JSON array of samples).

Pakai:
    python3 analyze_liveness_calibration.py samples.json

Definisi:
- Genuine (positif)  = label == 'real'
- Attack  (negatif)  = label != 'real' (print, screen, dst)
- FRR (False Rejection Rate) = proporsi sampel GENUINE yang score < threshold
                                (orang asli ditolak -- gangguan UX)
- FAR (False Acceptance Rate) = proporsi sampel ATTACK yang score >= threshold
                                 (spoof lolos -- risiko keamanan/fraud)

Cuma sampel dengan status == 'ok' yang dipakai untuk hitung FAR/FRR (sampel
'no-face'/'unknown' dilaporkan terpisah sebagai info tambahan, bukan bagian
dari kurva threshold karena tidak punya scoreReal).
"""
import json
import sys


def load_samples(path: str):
    with open(path, "r") as f:
        data = json.load(f)
    return data


def summarize_status(samples):
    by_label = {}
    for s in samples:
        label = s["label"]
        by_label.setdefault(label, {"ok": 0, "no-face": 0, "unknown": 0})
        by_label[label][s["status"]] += 1
    return by_label


def far_frr_at_threshold(genuine_scores, attack_scores, threshold):
    frr = sum(1 for s in genuine_scores if s < threshold) / len(genuine_scores) if genuine_scores else None
    far = sum(1 for s in attack_scores if s >= threshold) / len(attack_scores) if attack_scores else None
    return far, frr


def find_eer(genuine_scores, attack_scores, steps=181):
    best = None
    for i in range(steps):
        t = i / (steps - 1)
        far, frr = far_frr_at_threshold(genuine_scores, attack_scores, t)
        if far is None or frr is None:
            continue
        diff = abs(far - frr)
        if best is None or diff < best[0]:
            best = (diff, t, far, frr)
    return best  # (diff, threshold, far, frr)


def find_threshold_for_target_far(genuine_scores, attack_scores, target_far, steps=1001):
    """Cari threshold TERKECIL yang membuat FAR <= target_far (paling permisif
    yang masih memenuhi target keamanan), lalu laporkan FRR di titik itu."""
    candidates = []
    for i in range(steps):
        t = i / (steps - 1)
        far, frr = far_frr_at_threshold(genuine_scores, attack_scores, t)
        if far is None or frr is None:
            continue
        if far <= target_far:
            candidates.append((t, far, frr))
    if not candidates:
        return None
    candidates.sort(key=lambda x: x[0])
    return candidates[0]


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 analyze_liveness_calibration.py <samples.json>")
        sys.exit(1)

    samples = load_samples(sys.argv[1])
    status_summary = summarize_status(samples)

    print("=== Ringkasan jumlah sampel per label & status ===")
    total_ok = 0
    for label, counts in status_summary.items():
        total = sum(counts.values())
        print(f"  {label:10s} total={total:4d}  ok={counts['ok']:4d}  "
              f"no-face={counts['no-face']:3d}  unknown={counts['unknown']:3d}")
        total_ok += counts["ok"]
    print()

    ok_samples = [s for s in samples if s["status"] == "ok" and s.get("scoreReal") is not None]
    genuine = [s["scoreReal"] for s in ok_samples if s["label"] == "real"]
    attack = [s["scoreReal"] for s in ok_samples if s["label"] != "real"]

    if len(genuine) < 20 or len(attack) < 20:
        print(f"⚠️  PERINGATAN: sampel valid masih sedikit (genuine={len(genuine)}, "
              f"attack={len(attack)}). Rekomendasi threshold di bawah ini BELUM BISA "
              f"diandalkan -- kumpulkan lebih banyak sampel dulu (idealnya 50-100+ "
              f"per label) sebelum menetapkan threshold final.\n")

    print(f"Jumlah sampel valid (status=ok) dipakai untuk kalkulasi: "
          f"genuine={len(genuine)}, attack={len(attack)}\n")

    print("=== Kurva FAR/FRR per threshold (langkah 0.05) ===")
    print(f"{'threshold':>9} | {'FAR (spoof lolos)':>18} | {'FRR (asli ditolak)':>19}")
    for i in range(0, 21):
        t = i * 0.05
        far, frr = far_frr_at_threshold(genuine, attack, t)
        far_s = f"{far*100:.2f}%" if far is not None else "n/a"
        frr_s = f"{frr*100:.2f}%" if frr is not None else "n/a"
        print(f"{t:9.2f} | {far_s:>18} | {frr_s:>19}")
    print()

    eer = find_eer(genuine, attack)
    if eer:
        _, t_eer, far_eer, frr_eer = eer
        print(f"=== Equal Error Rate (EER) ===")
        print(f"  threshold ≈ {t_eer:.3f}  ->  FAR ≈ {far_eer*100:.2f}%, FRR ≈ {frr_eer*100:.2f}%")
        print(f"  (titik di mana FAR dan FRR kira-kira seimbang -- baseline netral,")
        print(f"   belum tentu yang terbaik untuk kasus presensi yang lebih")
        print(f"   mengutamakan keamanan daripada kenyamanan.)\n")

    for target in [0.01, 0.02, 0.05]:
        result = find_threshold_for_target_far(genuine, attack, target)
        if result:
            t, far, frr = result
            print(f"=== Threshold untuk target FAR <= {target*100:.0f}% ===")
            print(f"  threshold = {t:.3f}  ->  FAR = {far*100:.2f}%, FRR = {frr*100:.2f}%")
        else:
            print(f"=== Target FAR <= {target*100:.0f}% tidak tercapai di threshold manapun ===")
    print()
    print("Catatan: untuk presensi karyawan, FAR (spoof lolos) biasanya lebih")
    print("kritikal daripada FRR (karyawan asli harus ambil ulang foto -- cuma")
    print("gangguan kecil). Pertimbangkan pilih threshold di sekitar target")
    print("FAR <= 1-2%, SELAMA FRR yang dihasilkan masih dalam batas wajar")
    print("(mis. < 15-20%, supaya karyawan tidak keseringan gagal presensi).")


if __name__ == "__main__":
    main()