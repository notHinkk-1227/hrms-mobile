import { Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

/**
 * Normalize nomor HP Indonesia ke format internasional tanpa plus untuk wa.me.
 * Contoh: "0812-3456-7890" → "6281234567890", "+62 812..." → "6281234567890",
 *         "8123456789" → "628123456789".
 *
 * Aturan: strip semua non-digit, kalau diawali "0" ganti "62", kalau belum
 * diawali "62" tambah "62". Fallback: return digits-only kalau ambiguous.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  // Asumsi nomor lokal tanpa awalan 0 (e.g., "812...") → prepend 62
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
}

export function openWhatsApp(phone: string): Promise<unknown> {
  const normalized = normalizePhone(phone);
  if (!normalized) return Promise.reject(new Error('Nomor kosong'));
  return Linking.openURL(`https://wa.me/${normalized}`);
}

export function dialPhone(phone: string): Promise<unknown> {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return Promise.reject(new Error('Nomor kosong'));
  return Linking.openURL(`tel:${cleaned}`);
}

export function copyToClipboard(text: string): void {
  Clipboard.setString(text);
}

/**
 * Format nomor untuk display (human-readable): "0812-3456-7890".
 * Kalau format tidak dikenali, return original.
 */
export function formatPhoneDisplay(raw: string): string {
  const normalized = normalizePhone(raw);
  if (!normalized.startsWith('62') || normalized.length < 10) return raw;
  // 62 + 8-digit area + rest → 0XXX-XXXX-XXXX (Indonesia mobile pattern)
  const local = '0' + normalized.slice(2);
  if (local.length === 12) {
    return `${local.slice(0, 4)}-${local.slice(4, 8)}-${local.slice(8)}`;
  }
  if (local.length === 13) {
    return `${local.slice(0, 4)}-${local.slice(4, 8)}-${local.slice(8)}`;
  }
  return local;
}
