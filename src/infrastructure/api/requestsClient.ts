/**
 * Multi-doctype aggregator untuk MyRequests + TeamRequests.
 * 5 parallel REST call per doctype, merge + sort by creation desc.
 */

import { listByDoctype, RequestSummary, getApproverField } from './hrmsClient';

const REQUEST_DOCTYPES = [
  'Leave Application',
  'Expense Claim',
  'Employee Advance',
  'Attendance Request',
  'Shift Request',
] as const;

export type RequestDoctype = (typeof REQUEST_DOCTYPES)[number];

async function safeList(
  doctype: string,
  filters: Array<[string, string, unknown]>,
  limit: number,
): Promise<RequestSummary[]> {
  try {
    return await listByDoctype(doctype, filters, limit);
  } catch {
    // Kalau satu doctype error (e.g., user tidak punya permission), tetap return [].
    return [];
  }
}

export async function listMyRequests(
  employee: string,
  limit = 50,
): Promise<RequestSummary[]> {
  const results = await Promise.all(
    REQUEST_DOCTYPES.map((dt) => safeList(dt, [['employee', '=', employee]], limit)),
  );
  return results.flat().sort((a, b) => (b.creation < a.creation ? -1 : 1));
}

export async function listTeamRequests(
  approverUser: string,
  limit = 50,
): Promise<RequestSummary[]> {
  const results = await Promise.all(
    REQUEST_DOCTYPES.map((dt) => {
      const field = getApproverField(dt);
      if (!field || field === '_assign') {
        // Attendance Request pakai _assign (ToDo); skip dulu di MVP — server
        // perlu method khusus untuk filter _assign. Defer.
        return Promise.resolve([] as RequestSummary[]);
      }
      const filters: Array<[string, string, unknown]> = [
        [field, '=', approverUser],
        ['status', '=', 'Open'],
      ];
      return safeList(dt, filters, limit);
    }),
  );
  return results.flat().sort((a, b) => (b.creation < a.creation ? -1 : 1));
}

export function getDoctypeLabel(doctype: string): string {
  switch (doctype) {
    case 'Leave Application':
      return 'Cuti';
    case 'Expense Claim':
      return 'Klaim';
    case 'Employee Advance':
      return 'Kasbon';
    case 'Attendance Request':
      return 'Koreksi Presensi';
    case 'Shift Request':
      return 'Ganti Shift';
    default:
      return doctype;
  }
}

export function getStatusVariant(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'Approved':
    case 'Paid':
      return 'success';
    case 'Open':
    case 'Draft':
    case 'Submitted':
    case 'Unpaid':
      return 'warning';
    case 'Rejected':
    case 'Cancelled':
      return 'error';
    default:
      return 'neutral';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'Approved':
      return 'Disetujui';
    case 'Rejected':
      return 'Ditolak';
    case 'Open':
    case 'Submitted':
      return 'Menunggu Persetujuan';
    case 'Cancelled':
      return 'Dibatalkan';
    case 'Draft':
      return 'Draf';
    case 'Paid':
      return 'Dibayar';
    case 'Unpaid':
      return 'Belum Dibayar';
    default:
      return status;
  }
}
