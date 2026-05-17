import { createTenantClient } from './tenantClient';
import { toApiError } from './errors';

export type TaskStatus =
  | 'Open'
  | 'Working'
  | 'Pending Review'
  | 'Overdue'
  | 'Completed'
  | 'Cancelled'
  | 'Template';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface TaskItem {
  name: string;
  subject: string;
  project: string | null;
  /** Nama proyek (display) dari Project doctype yang di-link */
  project_name: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  exp_end_date: string | null;
  exp_start_date: string | null;
  progress: number | null;
  description: string | null;
  department: string | null;
}

const TASK_FIELDS = [
  'name',
  'subject',
  'project',
  'status',
  'priority',
  'exp_end_date',
  'exp_start_date',
  'progress',
  'description',
  'department',
];

/**
 * ERPNext Task tidak punya field `assigned_to` langsung — assignment di-track
 * via Frappe `_assign` JSON array string yang berisi user emails. Query pakai
 * filter `_assign LIKE %email%`.
 */
export const taskApi = {
  /**
   * List Task yang di-assign ke user (lewat _assign LIKE email).
   * `openOnly=true` (default): exclude Completed/Cancelled.
   */
  async listAssignedToMe(
    userEmail: string,
    openOnly = true,
    limit = 100,
  ): Promise<TaskItem[]> {
    try {
      const client = createTenantClient();
      const filters: Array<[string, string, unknown]> = [
        ['_assign', 'like', `%${userEmail}%`],
      ];
      if (openOnly) {
        filters.push(['status', 'not in', ['Completed', 'Cancelled']]);
      }
      const res = await client.get('/api/resource/Task', {
        params: {
          filters: JSON.stringify(filters),
          fields: JSON.stringify(TASK_FIELDS),
          order_by: 'exp_end_date asc, priority desc',
          limit_page_length: limit,
        },
      });
      const tasks = (res.data?.data ?? []) as Omit<TaskItem, 'project_name'>[];

      // Enrich dengan project_name — fetch sekali untuk semua project ID unik
      const projectIds = Array.from(
        new Set(tasks.map((t) => t.project).filter((p): p is string => !!p)),
      );
      const nameMap = new Map<string, string>();
      if (projectIds.length > 0) {
        try {
          const projRes = await client.get('/api/resource/Project', {
            params: {
              filters: JSON.stringify([['name', 'in', projectIds]]),
              fields: JSON.stringify(['name', 'project_name']),
              limit_page_length: projectIds.length,
            },
          });
          const projects = (projRes.data?.data ?? []) as Array<{
            name: string;
            project_name: string | null;
          }>;
          for (const p of projects) {
            if (p.project_name) nameMap.set(p.name, p.project_name);
          }
        } catch {
          // silent — fallback ke project ID kalau enrichment gagal
        }
      }

      return tasks.map((t) => ({
        ...t,
        project_name: t.project ? nameMap.get(t.project) ?? null : null,
      }));
    } catch (e) {
      throw toApiError(e);
    }
  },

  /** Update status ke Completed */
  async markCompleted(name: string): Promise<void> {
    try {
      const client = createTenantClient();
      await client.put(`/api/resource/Task/${encodeURIComponent(name)}`, {
        status: 'Completed',
      });
    } catch (e) {
      throw toApiError(e);
    }
  },

  /** Update status arbitrary (Working / Pending Review / dst) */
  async setStatus(name: string, status: TaskStatus): Promise<void> {
    try {
      const client = createTenantClient();
      await client.put(`/api/resource/Task/${encodeURIComponent(name)}`, {
        status,
      });
    } catch (e) {
      throw toApiError(e);
    }
  },
};
