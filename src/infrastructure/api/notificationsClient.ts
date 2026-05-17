import { createTenantClient } from './tenantClient';
import { toApiError } from './errors';

export type NotificationType =
  | 'Mention'
  | 'Energy Point'
  | 'Assignment'
  | 'Share'
  | 'Alert'
  | string;

export interface NotificationLog {
  name: string;
  subject: string;
  for_user: string;
  type: NotificationType;
  email_content: string | null;
  document_type: string | null;
  document_name: string | null;
  from_user: string | null;
  read: 0 | 1;
  creation: string;
}

const FIELDS = [
  'name',
  'subject',
  'for_user',
  'type',
  'email_content',
  'document_type',
  'document_name',
  'from_user',
  'read',
  'creation',
];

export const notificationsApi = {
  async list(user: string, limit = 50): Promise<NotificationLog[]> {
    try {
      const client = createTenantClient();
      const res = await client.get('/api/resource/Notification Log', {
        params: {
          filters: JSON.stringify([['for_user', '=', user]]),
          fields: JSON.stringify(FIELDS),
          order_by: 'creation desc',
          limit_page_length: limit,
        },
      });
      return res.data?.data ?? [];
    } catch (e) {
      throw toApiError(e);
    }
  },

  async countUnread(user: string): Promise<number> {
    try {
      const client = createTenantClient();
      const res = await client.get('/api/resource/Notification Log', {
        params: {
          filters: JSON.stringify([
            ['for_user', '=', user],
            ['read', '=', 0],
          ]),
          fields: JSON.stringify(['name']),
          limit_page_length: 100,
        },
      });
      const list: Array<unknown> = res.data?.data ?? [];
      return list.length;
    } catch {
      // silent — badge optional
      return 0;
    }
  },

  async markRead(name: string): Promise<void> {
    try {
      const client = createTenantClient();
      // Pakai endpoint khusus Notification Log Frappe — `mark_as_read` di
      // `frappe/desk/doctype/notification_log/notification_log.py:194` pakai
      // `frappe.db.set_value` (bypass permission check), jadi user dengan
      // role apapun bisa mark-read notif untuk dirinya sendiri.
      await client.post(
        '/api/method/frappe.desk.doctype.notification_log.notification_log.mark_as_read',
        { docname: name },
      );
    } catch (e) {
      throw toApiError(e);
    }
  },
};
