import { persist, StorageKeys } from '@infrastructure/storage/mmkv';

/**
 * Mobile-side dedup untuk client_uuid clock-in submissions.
 *
 * Vanilla mode (tanpa sopwer_hrms): Frappe Employee Checkin tidak punya field
 * `client_uuid`; field di-abaikan saat POST. Idempotency dijaga di sini —
 * mobile mark UUID sent post-success, dan reject duplicate sebelum kirim
 * ulang (mis. retry network).
 *
 * Trade-off (per user lock 2026-05-21): kalau app state hilang sambil ada
 * outbox unsent dengan UUID lama, retry bisa create duplikat di server.
 * Accept risk.
 */

const MAX_ENTRIES = 500;

function read(): string[] {
  return persist.getObject<string[]>(StorageKeys.SENT_UUIDS) ?? [];
}

function write(list: string[]): void {
  persist.setObject(StorageKeys.SENT_UUIDS, list);
}

export function hasSent(uuid: string): boolean {
  return read().includes(uuid);
}

export function markSent(uuid: string): void {
  const list = read();
  if (list.includes(uuid)) return;
  list.push(uuid);
  if (list.length > MAX_ENTRIES) {
    list.splice(0, list.length - MAX_ENTRIES);
  }
  write(list);
}

/** @internal — test-only reset; jangan dipakai di production code. */
export function _resetSentUuidsForTest(): void {
  persist.delete(StorageKeys.SENT_UUIDS);
}
