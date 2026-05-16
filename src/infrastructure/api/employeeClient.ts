import { createTenantClient } from './tenantClient';
import { toApiError } from './errors';
import type { AllowedLocation } from '@domain/entities/checkin';

export interface ShiftAssignment {
  name: string;
  employee: string;
  shift_type: string;
  start_date: string;
  end_date: string | null;
  shift_location: string | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getActiveShiftAssignments(employee: string): Promise<ShiftAssignment[]> {
  try {
    const client = createTenantClient();
    const today = todayIso();
    const response = await client.get('/api/resource/Shift Assignment', {
      params: {
        filters: JSON.stringify([
          ['employee', '=', employee],
          ['status', '=', 'Active'],
          ['start_date', '<=', today],
        ]),
        or_filters: JSON.stringify([
          ['end_date', '>=', today],
          ['end_date', 'is', 'not set'],
        ]),
        fields: JSON.stringify(['name', 'employee', 'shift_type', 'start_date', 'end_date', 'shift_location']),
        limit_page_length: 5,
      },
    });
    return response.data?.data ?? [];
  } catch (e) {
    throw toApiError(e);
  }
}

export async function getShiftLocations(names: string[]): Promise<AllowedLocation[]> {
  if (names.length === 0) return [];
  try {
    const client = createTenantClient();
    const response = await client.get('/api/resource/Shift Location', {
      params: {
        filters: JSON.stringify([['name', 'in', names]]),
        fields: JSON.stringify(['name', 'location_name', 'latitude', 'longitude', 'radius']),
        limit_page_length: 50,
      },
    });
    const rows: Array<Record<string, unknown>> = response.data?.data ?? [];
    return rows
      .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
      .map((r) => ({
        name: String(r.name),
        locationName: r.location_name ? String(r.location_name) : undefined,
        latitude: r.latitude as number,
        longitude: r.longitude as number,
        radiusM: typeof r.radius === 'number' ? (r.radius as number) : 100,
      }));
  } catch (e) {
    throw toApiError(e);
  }
}

/** Convenience: get allowed shift locations untuk employee hari ini. */
export async function getAllowedLocationsForToday(employee: string): Promise<AllowedLocation[]> {
  const shifts = await getActiveShiftAssignments(employee);
  const locationNames = shifts
    .map((s) => s.shift_location)
    .filter((n): n is string => Boolean(n));
  if (locationNames.length === 0) return [];
  return getShiftLocations(locationNames);
}
