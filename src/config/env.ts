/**
 * Runtime configuration.
 *
 * Aturan (per memory feedback_mobile_env_dynamic): APK harus jalan di local/dev/prod
 * tanpa rebuild; jangan hardcode site name/path di kode aplikasi.
 *
 * Strategi v1: default ke production controller. Override via debug build flavor
 * atau via MMKV `config.controller_url` (override saat startup di hydrate).
 */

const DEFAULT_CONTROLLER_URL = 'https://office.sopwer.id';

export const env = {
  controllerUrl: DEFAULT_CONTROLLER_URL,
};

export function setControllerUrl(url: string): void {
  env.controllerUrl = url;
}
