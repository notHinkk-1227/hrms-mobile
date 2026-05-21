/**
 * @format
 * Unit test untuk mobile-side dedup store sentUuids.
 *
 * Per locked decision plan dual-mode: vanilla clock-in tidak persist client_uuid
 * di server (Frappe abaikan field unknown). Dedup hanya client-side via MMKV.
 */

import { hasSent, markSent, _resetSentUuidsForTest } from '@infrastructure/persistence/sentUuids';

describe('sentUuids', () => {
  beforeEach(() => {
    _resetSentUuidsForTest();
  });

  test('hasSent returns false untuk UUID yang belum pernah di-mark', () => {
    expect(hasSent('uuid-fresh-001')).toBe(false);
  });

  test('markSent + hasSent — UUID baru ter-mark', () => {
    markSent('uuid-001');
    expect(hasSent('uuid-001')).toBe(true);
  });

  test('hasSent isolated per UUID', () => {
    markSent('uuid-A');
    expect(hasSent('uuid-A')).toBe(true);
    expect(hasSent('uuid-B')).toBe(false);
  });

  test('markSent idempotent — call dua kali tetap hasSent=true', () => {
    markSent('uuid-dup');
    markSent('uuid-dup');
    expect(hasSent('uuid-dup')).toBe(true);
  });

  test('LRU cap — entry tertua di-drop saat melewati MAX_ENTRIES', () => {
    // Cap MAX_ENTRIES = 500 (implementation detail).
    // Mark 501 unique UUID, verify yang pertama di-evict.
    for (let i = 0; i < 501; i++) {
      markSent(`uuid-${i}`);
    }
    expect(hasSent('uuid-0')).toBe(false); // tertua, evicted
    expect(hasSent('uuid-500')).toBe(true); // terbaru, retained
  });

  test('persist across module re-read (simulate app restart)', () => {
    markSent('uuid-persist-001');
    // Re-load module — sentUuids harus baca dari MMKV
    jest.resetModules();
    const reloaded = require('@infrastructure/persistence/sentUuids');
    expect(reloaded.hasSent('uuid-persist-001')).toBe(true);
  });
});
