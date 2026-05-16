/**
 * Port: Integrity signals untuk anti-fake GPS layered defense. Implementasi via
 * jail-monkey + native Play Integrity bridge di infrastructure/integrity.
 */

import type { IntegritySignals } from '@domain/entities/checkin';

export interface IntegrityPort {
  /** True kalau device pakai mock location app (Lockito, dll). */
  isMockLocation(): Promise<boolean>;

  /** True kalau device rooted/jailbroken. */
  isRootedDevice(): Promise<boolean>;

  /**
   * Request Play Integrity verdict. Returns 'Unknown' kalau gagal (timeout, no
   * Play Services). Tidak pernah throw — caller masih bisa lanjut tanpa.
   */
  getPlayIntegrityVerdict(options?: { timeoutMs?: number }): Promise<'Pass' | 'Fail' | 'Unknown'>;

  /** Aggregate semua signal jadi satu IntegritySignals object. */
  collectSignals(): Promise<IntegritySignals>;
}
