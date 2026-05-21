/**
 * Single source of truth untuk identitas build mobile.
 *
 * VERSION otomatis di-baca dari native build (Android: versionName di
 * `android/app/build.gradle`, iOS: CFBundleShortVersionString di Info.plist)
 * via `react-native-device-info`. Tidak perlu update manual di sini —
 * cukup bump di build.gradle / Info.plist saat release.
 */

import DeviceInfo from 'react-native-device-info';

export const APP_NAME = 'Hadir by Sopwer';
export const VERSION = DeviceInfo.getVersion();
export const COMPANY_NAME = 'PT Sopwer Teknologi Indonesia';
export const COMPANY_TAGLINE = 'Maksimalkan Potensi Karyawan';

/**
 * App ID untuk sopwer_controller — harus terdaftar di `Tenant App` master +
 * tiap Tenant Code wajib menambahkan ID ini ke `allowed_apps` (dengan quota
 * max_devices). Lowercase alfanumerik + dash, 3-32 char.
 *
 * Saat ganti ID di sini: koordinasi dengan admin sopwer_controller untuk
 * register app baru + migrasi allowed_apps di tenant existing.
 */
export const APP_ID = 'sopwer-hrms';

/**
 * Apakah build ini debug/internal testing. `__DEV__` true di Metro dev build,
 * false di release. Override jadi `true` selama dogfood internal supaya
 * indikator versi + debug badge tetap muncul di APK release.
 */
export const DEBUG_MODE = false;

export function getVersionLabel(): string {
  const base = `v${VERSION}`;
  return DEBUG_MODE ? `${base} · DEBUG` : base;
}

export function getFullLabel(): string {
  return `${APP_NAME} ${getVersionLabel()}`;
}
