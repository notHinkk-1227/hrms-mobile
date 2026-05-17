import { AxiosInstance } from 'axios';
import { createPublicTenantClient } from '@infrastructure/api/tenantClient';
import { ApiError, toApiError } from '@infrastructure/api/errors';
import type { Employee } from '@domain/entities/employee';

const EMPLOYEE_FIELDS = [
  'name',
  'employee_name',
  'user_id',
  'department',
  'designation',
  'image',
  'status',
  'date_of_joining',
  'company',
  'branch',
  'reports_to',
  'cell_number',
  'holiday_list',
];

export interface LoginResult {
  user: string;
  employee: Employee;
}

async function loginToFrappe(client: AxiosInstance, email: string, password: string): Promise<string> {
  const response = await client.post('/api/method/login', {
    usr: email,
    pwd: password,
  });
  const data = response.data;
  const message = typeof data?.message === 'string' ? data.message : undefined;
  if (message && message.toLowerCase().includes('logged in')) {
    return data?.full_name ?? email;
  }
  // Some Frappe configs return non-200 on failure; if reached here without throw, treat as success
  return data?.full_name ?? email;
}

async function fetchEmployeeForUser(client: AxiosInstance, userId: string): Promise<Employee> {
  const response = await client.get('/api/resource/Employee', {
    params: {
      filters: JSON.stringify([['user_id', '=', userId]]),
      fields: JSON.stringify(EMPLOYEE_FIELDS),
      limit_page_length: 1,
    },
  });
  const list = response.data?.data;
  if (!Array.isArray(list) || list.length === 0) {
    throw new ApiError('not_found', 'Akun tidak terdaftar sebagai karyawan');
  }
  const e = list[0];
  return {
    name: e.name,
    employee_name: e.employee_name,
    user_id: e.user_id,
    department: e.department ?? null,
    designation: e.designation ?? null,
    image: e.image ?? null,
    status: e.status ?? null,
    date_of_joining: e.date_of_joining ?? null,
    company: e.company ?? null,
    branch: e.branch ?? null,
    reports_to: e.reports_to ?? null,
    cell_number: e.cell_number ?? null,
    holiday_list: e.holiday_list ?? null,
  };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const client = createPublicTenantClient();
    await loginToFrappe(client, email, password);
    const employee = await fetchEmployeeForUser(client, email);
    return { user: email, employee };
  } catch (error) {
    throw toApiError(error);
  }
}

export async function logoutFromFrappe(): Promise<void> {
  try {
    const client = createPublicTenantClient();
    await client.post('/api/method/logout');
  } catch {
    // Best-effort; ignore failures on logout
  }
}
