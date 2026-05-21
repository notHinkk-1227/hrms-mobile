export interface ChangelogEntry {
  version: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  items: string[];
}

/**
 * Tambah entry baru di paling atas setiap rilis. Format date YYYY-MM-DD.
 * Tulisan ringkas, user-facing — bukan technical commit log.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.5.0',
    date: '2026-05-21',
    items: [
      'Daftar Permohonan Tim, Permohonan Saya, dan Riwayat Presensi sekarang auto-refresh saat Anda kembali dari layar detail — tidak perlu tarik-untuk-refresh manual setelah approve/reject/submit',
      'Notifikasi muncul otomatis: saat Anda submit cuti / klaim / kasbon / koreksi presensi / tukar shift, atasan dapat push notif; saat slip gaji bulan baru terbit, Anda dapat push notif',
      'Hitungan badge "belum dibaca" di Inbox tetap tersimpan setelah logout/login — tidak balik lagi ke nol setelah re-login',
      'Notifikasi tab juga auto-refresh tiap kali dibuka',
    ],
  },
  {
    version: '1.4.4',
    date: '2026-05-21',
    items: [
      'Fix kritis: library "react-native-view-shot" sebelumnya tidak ter-link di native build karena PackageList yang ter-cache stale. Sekarang stempel info foto (selfie + peta + overlay GPS) sudah bisa di-capture normal di mode standard maupun enhanced',
    ],
  },
  {
    version: '1.4.3',
    date: '2026-05-21',
    items: [
      'Layar Masuk: logo "Hadir by Sopwer" pindah ke atas, nama perusahaan di bawah logo',
      'URL backend disembunyikan — sekarang muncul kecil di bawah tombol Masuk, dengan hanya 5 karakter awal yang terbaca (sisanya disamarkan)',
      'Tombol "Ganti Kode Tenant" pindah ke samping URL (icon kecil)',
      'Pesan "Stempel info tidak dibuat" sekarang menampilkan detail error untuk bantu diagnosa kalau composite foto gagal di-capture',
    ],
  },
  {
    version: '1.4.2',
    date: '2026-05-21',
    items: [
      'Perbaikan stempel info di foto presensi — composite (selfie + peta + overlay GPS) sekarang menunggu foto selfie selesai decode sebelum di-capture, tidak hanya peta. Sebelumnya pesan "Stempel info tidak dibuat" muncul setiap kirim presensi',
    ],
  },
  {
    version: '1.4.1',
    date: '2026-05-21',
    items: [
      'Mode standard (tanpa sopwer_hrms) — kolom "Alasan presensi di luar lokasi" sekarang juga muncul, dengan alasan disimpan sebagai catatan di Employee Checkin (lihat di Frappe Desk timeline)',
      'Mobile-side dedup: kalau koneksi putus saat kirim presensi, retry tidak akan bikin presensi ganda',
      'Foto + GPS tetap dikirim ke Employee Checkin baik di mode standard maupun enhanced — backend HR cukup pakai bawaan Frappe HR',
      'Stabilitas: perbaikan kecil di layar konfirmasi presensi (peta + tata letak tombol)',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-05-18',
    items: [
      'Push notification saat app tertutup — pengumuman, tugas baru, dan persetujuan permohonan langsung masuk ke notification tray Android',
      'Auto-subscribe ke topic broadcast pengumuman saat login (per tenant)',
      'Tap notif → langsung buka screen yang sesuai (Inbox detail, Task list, Request detail)',
      'Pakai Frappe Cloud Notification Relay open-source (self-host, FCM gratis) — multi-app Sopwer share infra',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-05-17',
    items: [
      'Inbox / Pengumuman — pengumuman dari management masuk ke icon surat di Beranda dengan badge unread',
      'Detail pengumuman menampilkan body lengkap + lampiran (PDF/gambar/file) yang bisa di-tap untuk dibuka',
      'Realtime: pengumuman baru langsung muncul di mobile tanpa perlu refresh (via socket.io)',
      'Read tracking client-side — pengumuman ditandai sudah dibaca otomatis saat dibuka',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-05-17',
    items: [
      'Dukungan backend sopwer_hrms (enhanced mode) — geofence soft-block, anti-fake GPS, selfie wajib, device binding, scoring server-side',
      'Auto-detect backend: tenant tanpa sopwer_hrms tetap berfungsi (standard mode pakai Frappe HR REST)',
      'Auto-pair device pertama kali login',
      'TextField "Alasan presensi di luar lokasi" muncul saat di luar geofence',
      'Debug Screen tampil Backend mode (Standard / Enhanced vX.Y.Z) + feature flags',
    ],
  },
  {
    version: '1.0.11',
    date: '2026-05-17',
    items: [
      'Fix biometric login flow: RootNavigator tidak gate biometricUnlocked lagi setelah login berhasil',
      'Privacy consent dipertahankan antar session (tidak reset saat logout)',
      'Tombol sidik jari di LoginScreen kembali bekerja',
    ],
  },
  {
    version: '1.0.10',
    date: '2026-05-17',
    items: [
      'Fix biometric session save — tidak butuh apiKey/secret (Phase 1 cookie auth)',
      'Notifikasi: tombol "Tandai semua dibaca" selalu tampil + PUT loop reliable',
      'Diagnostic Debug Screen tampil unread count + realtime status',
    ],
  },
  {
    version: '1.0.9',
    date: '2026-05-17',
    items: [
      'Layar Debug diagnostic (Tentang Aplikasi → long-press versi)',
      'Rebundle JS bersih untuk pastikan update benar terpasang',
    ],
  },
  {
    version: '1.0.8',
    date: '2026-05-17',
    items: [
      'Biometric: session sesi langsung tersimpan saat aktifkan toggle (tidak perlu logout dulu)',
      'Hero "Sudah Pulang" pakai warna biru standar (seragam dengan state lain)',
      'Tandai semua dibaca: PUT loop fallback supaya pasti zero out badge notifikasi',
    ],
  },
  {
    version: '1.0.7',
    date: '2026-05-17',
    items: [
      'Tombol icon sidik jari di sebelah tombol Masuk',
      'Task: tampil nama proyek (project_name), bukan kode',
      'Task: subtitle ERPNext dihapus dari header',
      'Hero card: shadow dikecilkan supaya tidak ada strip aneh di bawah',
    ],
  },
  {
    version: '1.0.6',
    date: '2026-05-17',
    items: [
      'Tema warna: 5 preset di Profile (Biru/Hijau/Ungu/Oranye/Gelap)',
      'Biometric login button di LoginScreen (logout preserve session)',
      'Notifikasi: tombol "Tandai semua dibaca"',
      'CTA hero card: shadow dihapus (cegah strip terang di bawah)',
    ],
  },
  {
    version: '1.0.5',
    date: '2026-05-17',
    items: [
      'Hero label dipendekkan ("SUDAH MASUK"/"SUDAH PULANG") + GPS pill pindah ke bawah jam',
      'Splash + Login: trademark PT Sopwer Teknologi Indonesia di bawah versi',
    ],
  },
  {
    version: '1.0.4',
    date: '2026-05-17',
    items: [
      'GPS pill cuma muncul saat GPS benar-benar aktif',
      'Hero in_progress/done: tampil jam masuk/pulang sebagai big text + label "JAM MASUK"',
      'Task: filter Proyek',
      'Realtime: console.log diagnostic + polling fallback 60 detik',
    ],
  },
  {
    version: '1.0.3',
    date: '2026-05-17',
    items: [
      'Tab Task baru pakai DocType Task ERPNext (sebelumnya pakai ToDo)',
      'Notifikasi realtime saat ada task baru di-assign ke Anda',
      'Detail Presensi lebih ringkas (kurang scroll)',
      'Riwayat Versi di Tentang Aplikasi',
    ],
  },
  {
    version: '1.0.2',
    date: '2026-05-17',
    items: [
      'Tambah Kebijakan Privasi di Tentang Aplikasi',
      'Pilihan bahasa di Profil (Indonesia / English)',
      'Application ID diganti ke com.sopwer.hadir',
    ],
  },
  {
    version: '1.0.1',
    date: '2026-05-17',
    items: [
      'Login biometrik (sidik jari / wajah)',
      'Peta lokasi presensi via OpenStreetMap',
      'Filter Tugas lebih ringkas (1 baris)',
      'Permohonan: gabungan Saya + Tim dengan toggle',
      'Tab Task menggantikan tab Tim',
      'Selfie tampil di Detail Presensi (fix private file)',
      'Layar berhasil presensi: latar hijau cerah',
      'Hero presensi: jam masuk + indikator GPS',
      'Filter Kalender tidak error meski tanpa akses HR',
      'Notifikasi auto-refresh saat balik ke Beranda',
      'Trademark PT Sopwer Teknologi Indonesia di layar login',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-05-17',
    items: [
      'Rilis pertama Hadir by Sopwer',
      'Presensi masuk/pulang dengan GPS + selfie',
      'Cuti, klaim, kasbon, koreksi presensi, tukar shift',
      'Slip gaji bulanan + kalender presensi',
      'ToDo, Kalender tim, direktori karyawan',
      'Tentang Aplikasi + info PT Sopwer Teknologi Indonesia',
    ],
  },
];

export function formatChangelogDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
