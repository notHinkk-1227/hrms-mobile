/**
 * Port: Location service. Implementasi via react-native-geolocation-service di
 * infrastructure/location.
 */

import type { Coordinate } from '@domain/entities/checkin';

export interface LocationPort {
  /** Request foreground permission. Returns granted state. */
  requestPermission(): Promise<boolean>;

  /** Current permission state without prompting. */
  hasPermission(): Promise<boolean>;

  /** Get current location with high accuracy. Throws kalau permission denied / timeout. */
  getCurrentPosition(options?: { timeoutMs?: number }): Promise<Coordinate>;
}
