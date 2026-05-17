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
      // Mark satu notif read pakai frappe.client.set_value (bypass permission
      // via Frappe core kalau session user adalah for_user dari notif itu).
      await client.put(`/api/resource/Notification Log/${encodeURIComponent(name)}`, {
        read: 1,
      });
    } catch (e) {
      throw toApiError(e);
    }
  },

  /**
   * Bulk mark semua notif user sebagai read. Coba dulu Frappe whitelisted
   * endpoint `mark_as_read` — kalau gagal atau session user tidak match,
   * fallback ke fetch unread list + PUT per-item (lebih reliable, lebih lambat
   * tapi pasti jalan).
   */
  async markAllRead(user: string): Promise<void> {
    const client = createTenantClient();
    try {
      await client.post(
        '/api/method/frappe.desk.doctype.notification_log.notification_log.mark_as_read',
      );
    } catch {
      // ignore, fallback ke loop di bawah
    }

    // Verify + force-update via PUT loop kalau masih ada unread
    try {
      const res = await client.get('/api/resource/Notification Log', {
        params: {
          filters: JSON.stringify([
            ['for_user', '=', user],
            ['read', '=', 0],
          ]),
          fields: JSON.stringify(['name']),
          limit_page_length: 200,
        },
      });
      const unread: Array<{ name: string }> = res.data?.data ?? [];
      if (unread.length === 0) return;

      // PUT per-item dalam batch parallel 10x supaya tidak overload server
      const BATCH = 10;
      for (let i = 0; i < unread.length; i += BATCH) {
        const slice = unread.slice(i, i + BATCH);
        await Promise.all(
          slice.map((n) =>
            client
              .put(`/api/resource/Notification Log/${encodeURIComponent(n.name)}`, {
                read: 1,
              })
              .catch(() => undefined),
          ),
        );
      }
    } catch (e) {
      throw toApiError(e);
    }
  },
};
