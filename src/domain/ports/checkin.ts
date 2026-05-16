/**
 * Port: Checkin API — wrapper untuk endpoint clock_in/clock_out + get_allowed_locations.
 * Implementasi via tenantClient axios di infrastructure/api/checkinClient.ts.
 */

import type {
  AllowedLocation,
  ClockInPayload,
  ClockInResult,
} from '@domain/entities/checkin';

export interface CheckinPort {
  /** Get allowed Shift Location untuk employee hari ini. */
  getAllowedLocations(): Promise<AllowedLocation[]>;

  /** Submit clock-in payload ke server. Throws on network/server error. */
  submitClockIn(payload: ClockInPayload): Promise<ClockInResult>;

  /** Submit clock-out payload (sama struktur, beda log_type). */
  submitClockOut(payload: ClockInPayload): Promise<ClockInResult>;
}
