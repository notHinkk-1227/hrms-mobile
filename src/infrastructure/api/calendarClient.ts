import { createTenantClient } from './tenantClient';
import { toApiError } from './errors';

export interface HolidayItem {
  name: string;
  holiday_date: string;
  description: string | null;
  weekly_off: 0 | 1;
}

export interface TeamLeaveItem {
  name: string;
  employee: string;
  employee_name: string | null;
  leave_type: string;
  from_date: string;
  to_date: string;
  half_day: 0 | 1;
  status: string;
}

export const calendarApi = {
  /** Ambil holiday_list dari Employee record. Null kalau employee tidak punya. */
  async getEmployeeHolidayList(employee: string): Promise<string | null> {
    try {
      const client = createTenantClient();
      const res = await client.get(
        `/api/resource/Employee/${encodeURIComponent(employee)}`,
        { params: { fields: JSON.stringify(['holiday_list']) } },
      );
      const doc = res.data?.data as { holiday_list?: string | null } | undefined;
      return doc?.holiday_list ?? null;
    } catch (e) {
      throw toApiError(e);
    }
  },

  /**
   * Holiday adalah child table di Holiday List. Pakai parent filter untuk
   * fetch hanya holiday dari list employee bersangkutan.
   */
  async listHolidays(
    holidayList: string,
    fromDate: string,
    toDate: string,
  ): Promise<HolidayItem[]> {
    try {
      const client = createTenantClient();
      const res = await client.get('/api/resource/Holiday', {
        params: {
          filters: JSON.stringify([
            ['parent', '=', holidayList],
            ['holiday_date', 'between', [fromDate, toDate]],
          ]),
          fields: JSON.stringify(['name', 'holiday_date', 'description', 'weekly_off']),
          order_by: 'holiday_date asc',
          limit_page_length: 200,
        },
      });
      return res.data?.data ?? [];
    } catch (e) {
      throw toApiError(e);
    }
  },

  /**
   * Approved leave anggota satu departemen yang overlap dengan range tanggal.
   * Server-side overlap filter pakai 2 kondisi (from_date <= toDate AND to_date >= fromDate).
   * Kalau `department` falsy: tampil semua approved leave overlapping range.
   */
  async listTeamLeaves(
    department: string | null | undefined,
    fromDate: string,
    toDate: string,
  ): Promise<TeamLeaveItem[]> {
    try {
      const client = createTenantClient();
      const filters: Array<[string, string, unknown]> = [
        ['status', '=', 'Approved'],
        ['from_date', '<=', toDate],
        ['to_date', '>=', fromDate],
      ];
      if (department) filters.unshift(['department', '=', department]);
      const res = await client.get('/api/resource/Leave Application', {
        params: {
          filters: JSON.stringify(filters),
          fields: JSON.stringify([
            'name',
            'employee',
            'employee_name',
            'leave_type',
            'from_date',
            'to_date',
            'half_day',
            'status',
          ]),
          order_by: 'from_date asc',
          limit_page_length: 200,
        },
      });
      return res.data?.data ?? [];
    } catch (e) {
      throw toApiError(e);
    }
  },
};
