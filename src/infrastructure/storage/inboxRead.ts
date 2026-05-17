import { persist, StorageKeys } from './mmkv';

/**
 * Set of announcement names yang sudah dibaca user di device ini.
 *
 * Disimpan sebagai JSON array di MMKV (key `inbox.read`). Cap soft 500 entries
 * — kalau lebih, prune yang paling lama dimasukkan (FIFO). Cap supaya tidak
 * unbounded growth kalau user pakai app bertahun-tahun.
 *
 * Read tracking sengaja client-side per device (per requirement v1) — kalau
 * user reinstall / ganti device, read state hilang. HR tidak butuh dashboard
 * read receipt; defer ke v2 kalau diperlukan.
 */
const MAX_ENTRIES = 500;

function load(): string[] {
  return persist.getObject<string[]>(StorageKeys.INBOX_READ) ?? [];
}

function save(arr: string[]): void {
  const trimmed = arr.length > MAX_ENTRIES ? arr.slice(-MAX_ENTRIES) : arr;
  persist.setObject(StorageKeys.INBOX_READ, trimmed);
}

export const inboxRead = {
  isRead(name: string): boolean {
    return load().includes(name);
  },

  markRead(name: string): void {
    const arr = load();
    if (arr.includes(name)) return;
    arr.push(name);
    save(arr);
  },

  getReadSet(): Set<string> {
    return new Set(load());
  },

  size(): number {
    return load().length;
  },

  clearAll(): void {
    persist.delete(StorageKeys.INBOX_READ);
  },
};
