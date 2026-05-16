/**
 * HRMS REST client — namespace per doctype Frappe HR.
 * Semua endpoint pakai REST bawaan + method bawaan (hrms.hr.*).
 */

import { createTenantClient } from './tenantClient';
import { toApiError } from './errors';
import type { UploadedFile } from './uploadClient';

export interface LeaveType {
  name: string;
  max_continuous_days: number | null;
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
      fields: JSON.stringify(['name', 'max_continuous_days', 'is_lwp']),
      limit_page_length: 50,
    });
    return res.data ?? [];
  },

  async getLeaveDetails(employee: string, date: string): Promise<Record<string, LeaveBalance>> {
    const res = await get<{ message: Record<string, LeaveBalance> }>(
      '/api/method/hrms.hr.doctype.leave_application.leave_application.get_leave_details',
      { employee, date },
    );
    return res.message ?? {};
  },

  async submit(input: LeaveApplicationInput): Promise<{ name: string }> {
    const res = await post<{ data: { name: string } }>('/api/resource/Leave Application', {
      ...input,
      status: 'Open',
    });
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
      approval_status: 'Draft',
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
    const res = await post<{ data: { name: string } }>('/api/resource/Shift Request', {
      ...input,
      status: 'Draft',
    });
    return res.data;
  },
};

// Re-export untuk convenience
export type { UploadedFile };
