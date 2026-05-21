/**
 * HRMS REST client — namespace per doctype Frappe HR.
 * Semua endpoint pakai REST bawaan + method bawaan (hrms.hr.*).
 */

import { createTenantClient } from './tenantClient';
import { toApiError } from './errors';
import type { UploadedFile } from './uploadClient';

export interface LeaveType {
  name: string;
  max_continuous_days_allowed: number | null;
  is_lwp: 0 | 1;
}

export interface LeaveBalance {
  leave_balance: number;
  total_leaves_allocated: number;
  leaves_taken: number;
  leaves_pending_approval: number;
}

export interface LeaveApplicationInput {
  employee: string;
  leave_type: string;
  from_date: string; // YYYY-MM-DD
  to_date: string;
  half_day: 0 | 1;
  half_day_date?: string;
  description: string;
  leave_approver?: string;
}

export interface ExpenseClaimType {
  name: string;
  description: string | null;
}

export interface ExpenseClaimItem {
  expense_type: string;
  expense_date: string;
  description: string;
  amount: number;
  /** Optional link ke File doc, atau langsung pakai file_url di sanction_amount note */
  attachment_url?: string;
}

export interface ExpenseClaimInput {
  employee: string;
  expense_approver?: string;
  posting_date: string;
  expenses: ExpenseClaimItem[];
  project?: string;
  cost_center?: string;
  remark?: string;
}

export interface ModeOfPayment {
  name: string;
  type: string;
}

export interface EmployeeAdvanceInput {
  employee: string;
  posting_date: string;
  advance_amount: number;
  purpose: string;
  repay_unclaimed_amount_from_salary: 0 | 1;
  mode_of_payment?: string;
  advance_account?: string;
  company: string;
}

export interface AttendanceRequestInput {
  employee: string;
  from_date: string;
  to_date: string;
  reason: 'Work From Home' | 'On Duty';
  explanation: string;
  half_day: 0 | 1;
  half_day_date?: string;
}

export interface ShiftType {
  name: string;
  start_time: string;
  end_time: string;
}

export interface ShiftRequestInput {
  employee: string;
  shift_type: string;
  from_date: string;
  to_date?: string;
}

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  try {
    const client = createTenantClient();
    const response = await client.get(path, { params });
    return response.data as T;
  } catch (e) {
    throw toApiError(e);
  }
}

async function put<T>(path: string, body: unknown): Promise<T> {
  try {
    const client = createTenantClient();
    const response = await client.put(path, body);
    return response.data as T;
  } catch (e) {
    throw toApiError(e);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  try {
    const client = createTenantClient();
    const response = await client.post(path, body);
    return response.data as T;
  } catch (e) {
    throw toApiError(e);
  }
}

// ============ Leave ============

export const leaveApi = {
  async listTypes(): Promise<LeaveType[]> {
    const res = await get<{ data: LeaveType[] }>('/api/resource/Leave Type', {
      fields: JSON.stringify(['name', 'max_continuous_days_allowed', 'is_lwp']),
      limit_page_length: 50,
    });
    return res.data ?? [];
  },

  async getLeaveDetails(employee: string, date: string): Promise<Record<string, LeaveBalance>> {
    // Frappe HR endpoint balikin nested structure:
    //   { message: { leave_allocation: { "<type>": {remaining_leaves, total_leaves, leaves_taken, ...} }, ... } }
    // Mobile pakai shape flat {leave_balance, total_leaves_allocated, leaves_taken}.
    // Normalisasi di sini supaya UI tetap konsisten dengan field-name standar mobile.
    const res = await get<{
      message?: {
        leave_allocation?: Record<
          string,
          {
            remaining_leaves?: number;
            total_leaves?: number;
            leaves_taken?: number;
            leaves_pending_approval?: number;
            expired_leaves?: number;
          }
        >;
      };
    }>(
      '/api/method/hrms.hr.doctype.leave_application.leave_application.get_leave_details',
      { employee, date },
    );
    const allocation = res.message?.leave_allocation ?? {};
    const result: Record<string, LeaveBalance> = {};
    for (const [leaveType, info] of Object.entries(allocation)) {
      result[leaveType] = {
        leave_balance: Number(info.remaining_leaves ?? 0),
        total_leaves_allocated: Number(info.total_leaves ?? 0),
        leaves_taken: Number(info.leaves_taken ?? 0),
        leaves_pending_approval: Number(info.leaves_pending_approval ?? 0),
      };
    }
    return result;
  },

  async submit(input: LeaveApplicationInput): Promise<{ name: string }> {
    const res = await post<{ data: { name: string } }>('/api/resource/Leave Application', input);
    return res.data;
  },
};

// ============ Expense ============

export const expenseApi = {
  async listTypes(): Promise<ExpenseClaimType[]> {
    const res = await get<{ data: ExpenseClaimType[] }>('/api/resource/Expense Claim Type', {
      fields: JSON.stringify(['name', 'description']),
      limit_page_length: 50,
    });
    return res.data ?? [];
  },

  async submit(input: ExpenseClaimInput): Promise<{ name: string }> {
    const total = input.expenses.reduce((sum, e) => sum + e.amount, 0);
    const body = {
      ...input,
      total_claimed_amount: total,
      expenses: input.expenses.map((e) => ({
        expense_type: e.expense_type,
        expense_date: e.expense_date,
        description: e.description,
        amount: e.amount,
        sanctioned_amount: e.amount,
      })),
    };
    const res = await post<{ data: { name: string } }>('/api/resource/Expense Claim', body);
    return res.data;
  },
};

// ============ Advance ============

export const advanceApi = {
  async listModeOfPayment(): Promise<ModeOfPayment[]> {
    const res = await get<{ data: ModeOfPayment[] }>('/api/resource/Mode of Payment', {
      fields: JSON.stringify(['name', 'type']),
      limit_page_length: 20,
    });
    return res.data ?? [];
  },

  async submit(input: EmployeeAdvanceInput): Promise<{ name: string }> {
    const res = await post<{ data: { name: string } }>('/api/resource/Employee Advance', input);
    return res.data;
  },
};

// ============ Attendance Request ============

export const attendanceRequestApi = {
  async submit(input: AttendanceRequestInput): Promise<{ name: string }> {
    const res = await post<{ data: { name: string } }>('/api/resource/Attendance Request', input);
    return res.data;
  },
};

// ============ Shift Request ============

export const shiftRequestApi = {
  async listShiftTypes(): Promise<ShiftType[]> {
    const res = await get<{ data: ShiftType[] }>('/api/resource/Shift Type', {
      fields: JSON.stringify(['name', 'start_time', 'end_time']),
      limit_page_length: 50,
    });
    return res.data ?? [];
  },

  async submit(input: ShiftRequestInput): Promise<{ name: string }> {
    const res = await post<{ data: { name: string } }>('/api/resource/Shift Request', input);
    return res.data;
  },
};

// ============ List + Detail + Approval ============

export type RequestStatus = 'Open' | 'Approved' | 'Rejected' | 'Cancelled' | 'Draft';

export interface RequestSummary {
  doctype: string;
  name: string;
  employee: string;
  employee_name: string | null;
  status: RequestStatus | string;
  creation: string;
  modified: string;
  /** Human-readable summary line per doctype, e.g. "12-15 Apr · Cuti Tahunan" */
  primary: string;
  /** Optional secondary line, e.g. "Rp 250.000" untuk Expense */
  secondary?: string;
}

const APPROVER_FIELD: Record<string, string> = {
  'Leave Application': 'leave_approver',
  'Expense Claim': 'expense_approver',
  'Employee Advance': 'advance_approver',
  'Attendance Request': '_assign',
  'Shift Request': 'approver',
};

function makePrimary(doctype: string, doc: Record<string, unknown>): string {
  switch (doctype) {
    case 'Leave Application':
      return `${doc.from_date} → ${doc.to_date} · ${doc.leave_type}`;
    case 'Expense Claim': {
      const amount = (doc.total_claimed_amount as number | undefined) ?? 0;
      return `Rp ${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
    }
    case 'Employee Advance': {
      const amount = (doc.advance_amount as number | undefined) ?? 0;
      return `Rp ${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
    }
    case 'Attendance Request':
      return `${doc.from_date} → ${doc.to_date} · ${doc.reason}`;
    case 'Shift Request':
      return `${doc.from_date}${doc.to_date ? ` → ${doc.to_date}` : ''} · ${doc.shift_type}`;
    default:
      return String(doc.name);
  }
}

function makeSecondary(doctype: string, doc: Record<string, unknown>): string | undefined {
  switch (doctype) {
    case 'Leave Application':
      return doc.description ? String(doc.description).slice(0, 80) : undefined;
    case 'Expense Claim':
      return doc.posting_date ? `Tgl ${doc.posting_date}` : undefined;
    case 'Employee Advance':
      return doc.purpose ? String(doc.purpose).slice(0, 80) : undefined;
    case 'Attendance Request':
      return doc.explanation ? String(doc.explanation).slice(0, 80) : undefined;
    case 'Shift Request':
      return undefined;
    default:
      return undefined;
  }
}

const LIST_FIELDS: Record<string, string[]> = {
  'Leave Application': [
    'name',
    'employee',
    'employee_name',
    'leave_type',
    'from_date',
    'to_date',
    'description',
    'status',
    'creation',
    'modified',
  ],
  'Expense Claim': [
    'name',
    'employee',
    'employee_name',
    'posting_date',
    'total_claimed_amount',
    'approval_status',
    'status',
    'creation',
    'modified',
  ],
  'Employee Advance': [
    'name',
    'employee',
    'employee_name',
    'posting_date',
    'advance_amount',
    'purpose',
    'status',
    'creation',
    'modified',
  ],
  'Attendance Request': [
    'name',
    'employee',
    'employee_name',
    'from_date',
    'to_date',
    'reason',
    'explanation',
    'status',
    'creation',
    'modified',
  ],
  'Shift Request': [
    'name',
    'employee',
    'employee_name',
    'from_date',
    'to_date',
    'shift_type',
    'status',
    'creation',
    'modified',
  ],
};

export async function listByDoctype(
  doctype: string,
  filters: Array<[string, string, unknown]>,
  limit = 100,
): Promise<RequestSummary[]> {
  const fields = LIST_FIELDS[doctype] ?? ['name', 'employee', 'employee_name', 'status', 'creation', 'modified'];
  const res = await get<{ data: Array<Record<string, unknown>> }>(
    `/api/resource/${encodeURIComponent(doctype)}`,
    {
      filters: JSON.stringify(filters),
      fields: JSON.stringify(fields),
      order_by: 'creation desc',
      limit_page_length: limit,
    },
  );
  const rows = res.data ?? [];
  return rows.map((doc) => {
    // Expense Claim punya 2 status field:
    // - approval_status (Draft/Approved/Rejected) — diset oleh approver
    // - status (Draft/Submitted/Paid/Unpaid/Rejected/Cancelled) — submission state
    // Display logic: kalau approval_status sudah meaningful (Approved/Rejected) pakai itu,
    // kalau masih Draft (default) → tampilkan submission status biar user tahu sedang menunggu.
    let statusValue: string;
    if (doctype === 'Expense Claim') {
      const approvalStatus = doc.approval_status as string | undefined;
      const docStatus = doc.status as string | undefined;
      statusValue =
        approvalStatus && approvalStatus !== 'Draft'
          ? approvalStatus
          : docStatus ?? 'Draft';
    } else {
      statusValue = (doc.status as string) ?? 'Open';
    }
    return {
      doctype,
      name: String(doc.name),
      employee: String(doc.employee),
      employee_name: (doc.employee_name as string) ?? null,
      status: statusValue,
      creation: String(doc.creation),
      modified: String(doc.modified),
      primary: makePrimary(doctype, doc),
      secondary: makeSecondary(doctype, doc),
    };
  });
}

export async function getDoctype<T = Record<string, unknown>>(doctype: string, name: string): Promise<T> {
  const res = await get<{ data: T }>(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
  return res.data;
}

export async function updateDocStatus(
  doctype: string,
  name: string,
  status: 'Approved' | 'Rejected',
): Promise<void> {
  // For Expense Claim, also set approval_status
  const body: Record<string, unknown> = { status };
  if (doctype === 'Expense Claim') {
    body.approval_status = status;
  }
  await put<{ data: unknown }>(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, body);
}

export function getApproverField(doctype: string): string | undefined {
  return APPROVER_FIELD[doctype];
}

// ============ Salary Slip ============

export interface SalarySlipSummary {
  name: string;
  employee: string;
  start_date: string;
  end_date: string;
  net_pay: number;
  gross_pay: number;
  status: 'Draft' | 'Submitted' | 'Cancelled';
  posting_date: string;
}

export interface SalaryComponent {
  salary_component: string;
  amount: number;
}

export interface SalarySlipDetail extends SalarySlipSummary {
  total_working_days: number;
  payment_days: number;
  earnings: SalaryComponent[];
  deductions: SalaryComponent[];
  total_deduction: number;
}

export const salarySlipApi = {
  async list(employee: string, limit = 12): Promise<SalarySlipSummary[]> {
    const res = await get<{ data: SalarySlipSummary[] }>('/api/resource/Salary Slip', {
      filters: JSON.stringify([
        ['employee', '=', employee],
        ['docstatus', '!=', 2],
      ]),
      fields: JSON.stringify([
        'name',
        'employee',
        'start_date',
        'end_date',
        'net_pay',
        'gross_pay',
        'status',
        'posting_date',
      ]),
      order_by: 'start_date desc',
      limit_page_length: limit,
    });
    return res.data ?? [];
  },

  async get(name: string): Promise<SalarySlipDetail> {
    return getDoctype<SalarySlipDetail>('Salary Slip', name);
  },
};

// ============ Attendance ============

export interface AttendanceRecord {
  name: string;
  employee: string;
  attendance_date: string;
  status: 'Present' | 'Absent' | 'On Leave' | 'Half Day' | 'Work From Home' | string;
  shift: string | null;
  in_time: string | null;
  out_time: string | null;
}

export const attendanceApi = {
  async listByMonth(employee: string, year: number, month: number): Promise<AttendanceRecord[]> {
    const pad = (n: number) => String(n).padStart(2, '0');
    const from = `${year}-${pad(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${pad(month)}-${pad(lastDay)}`;
    const res = await get<{ data: AttendanceRecord[] }>('/api/resource/Attendance', {
      filters: JSON.stringify([
        ['employee', '=', employee],
        ['attendance_date', 'between', [from, to]],
      ]),
      fields: JSON.stringify([
        'name',
        'employee',
        'attendance_date',
        'status',
        'shift',
        'in_time',
        'out_time',
      ]),
      order_by: 'attendance_date desc',
      limit_page_length: 50,
    });
    return res.data ?? [];
  },
};

// ============ ToDo (Frappe bawaan) ============

export interface TodoItem {
  name: string;
  description: string; // HTML — strip ke text di mobile
  date: string | null;
  priority: 'High' | 'Medium' | 'Low' | string;
  status: 'Open' | 'Closed' | 'Cancelled' | string;
  reference_type: string | null;
  reference_name: string | null;
  assigned_by: string | null;
  assigned_by_full_name: string | null;
  color: string | null;
}

const TODO_FIELDS = [
  'name',
  'description',
  'date',
  'priority',
  'status',
  'reference_type',
  'reference_name',
  'assigned_by',
  'assigned_by_full_name',
  'color',
];

export type TodoStatus = 'Open' | 'Closed' | 'Cancelled';

export const todoApi = {
  async listMyOpen(user: string, limit = 100): Promise<TodoItem[]> {
    return todoApi.listMy(user, ['Open'], limit);
  },

  async listMy(user: string, statuses: TodoStatus[], limit = 100): Promise<TodoItem[]> {
    const filters: Array<[string, string, unknown]> = [['allocated_to', '=', user]];
    if (statuses.length > 0) {
      filters.push(['status', 'in', statuses]);
    }
    const res = await get<{ data: TodoItem[] }>('/api/resource/ToDo', {
      filters: JSON.stringify(filters),
      fields: JSON.stringify(TODO_FIELDS),
      order_by: 'date asc, priority desc',
      limit_page_length: limit,
    });
    return res.data ?? [];
  },

  async markDone(name: string): Promise<void> {
    await put<{ data: unknown }>(
      `/api/resource/ToDo/${encodeURIComponent(name)}`,
      { status: 'Closed' },
    );
  },
};

// Re-export untuk convenience
export type { UploadedFile };
