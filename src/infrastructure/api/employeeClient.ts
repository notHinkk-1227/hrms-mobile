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

export interface EmployeeApprovers {
  leave_approver: string | null;
  expense_approver: string | null;
  shift_request_approver: string | null;
}

export async function getEmployeeApprovers(name: string): Promise<EmployeeApprovers> {
  try {
    const client = createTenantClient();
    const response = await client.get(
      `/api/resource/Employee/${encodeURIComponent(name)}`,
      {
        params: {
          fields: JSON.stringify(['leave_approver', 'expense_approver', 'shift_request_approver']),
        },
      },
    );
    const doc = (response.data?.data ?? {}) as Record<string, string | null>;
    return {
      leave_approver: doc.leave_approver ?? null,
      expense_approver: doc.expense_approver ?? null,
      shift_request_approver: doc.shift_request_approver ?? null,
    };
  } catch (e) {
    throw toApiError(e);
  }
}

export interface ProjectOption {
  name: string;
  project_name: string;
}

export async function getProjects(limit = 50): Promise<ProjectOption[]> {
  try {
    const client = createTenantClient();
    const response = await client.get('/api/resource/Project', {
      params: {
        filters: JSON.stringify([['status', '=', 'Open']]),
        fields: JSON.stringify(['name', 'project_name']),
        limit_page_length: limit,
      },
    });
    return response.data?.data ?? [];
  } catch (e) {
    throw toApiError(e);
  }
}

export interface CostCenterOption {
  name: string;
  cost_center_name: string;
}

export interface EmployeeContact {
  name: string;
  employee_name: string;
  cell_number: string | null;
  company_email: string | null;
  personal_email: string | null;
  designation: string | null;
  department: string | null;
  branch: string | null;
  image: string | null;
  user_id: string | null;
  reports_to: string | null;
}

const EMPLOYEE_CONTACT_FIELDS = [
  'name',
  'employee_name',
  'cell_number',
  'company_email',
  'personal_email',
  'designation',
  'department',
  'branch',
  'image',
  'user_id',
  'reports_to',
];

/**
 * List karyawan satu departemen + atasan langsung (kalau ada). Skip self.
 * Kalau `department` falsy: tampil semua active employee (excl. self).
 * Filter status=Active. Order by employee_name.
 */
export async function listEmployeesByDept(
  department: string | null | undefined,
  selfName: string,
  reportsTo?: string | null,
  limit = 100,
): Promise<EmployeeContact[]> {
  try {
    const client = createTenantClient();
    const params: Record<string, unknown> = {
      filters: JSON.stringify([['status', '=', 'Active']]),
      fields: JSON.stringify(EMPLOYEE_CONTACT_FIELDS),
      order_by: 'employee_name asc',
      limit_page_length: limit,
    };
    if (department) {
      const orFilters: Array<[string, string, unknown]> = [
        ['department', '=', department],
      ];
      if (reportsTo) orFilters.push(['name', '=', reportsTo]);
      params.or_filters = JSON.stringify(orFilters);
    }
    const res = await client.get('/api/resource/Employee', { params });
    const rows: EmployeeContact[] = res.data?.data ?? [];
    return rows.filter((r) => r.name !== selfName);
  } catch (e) {
    throw toApiError(e);
  }
}

export async function getEmployeeContact(name: string): Promise<EmployeeContact | null> {
  try {
    const client = createTenantClient();
    const res = await client.get(
      `/api/resource/Employee/${encodeURIComponent(name)}`,
      { params: { fields: JSON.stringify(EMPLOYEE_CONTACT_FIELDS) } },
    );
    return (res.data?.data as EmployeeContact | null) ?? null;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function getCostCenters(company?: string, limit = 50): Promise<CostCenterOption[]> {
  try {
    const client = createTenantClient();
    const filters: Array<[string, string, unknown]> = [
      ['is_group', '=', 0],
      ['disabled', '=', 0],
    ];
    if (company) filters.push(['company', '=', company]);
    const response = await client.get('/api/resource/Cost Center', {
      params: {
        filters: JSON.stringify(filters),
        fields: JSON.stringify(['name', 'cost_center_name']),
        limit_page_length: limit,
      },
    });
    return response.data?.data ?? [];
  } catch (e) {
    throw toApiError(e);
  }
}
