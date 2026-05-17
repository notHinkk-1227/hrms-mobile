import { createTenantClient } from './tenantClient';
import { toApiError } from './errors';

export type AnnouncementPriority = 'Low' | 'Normal' | 'High';

export interface AnnouncementListItem {
  name: string;
  subject: string;
  priority: AnnouncementPriority;
  published_at: string | null;
  author: string | null;
  author_full_name: string;
  body_excerpt: string;
  has_attachments: boolean;
}

export interface AnnouncementAttachment {
  name: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  is_private: 0 | 1;
}

export interface AnnouncementDetail {
  name: string;
  subject: string;
  body: string;
  priority: AnnouncementPriority;
  published_at: string | null;
  author: string | null;
  author_full_name: string;
  attachments: AnnouncementAttachment[];
}

export const inboxApi = {
  async listPublished(limit = 50, offset = 0): Promise<AnnouncementListItem[]> {
    try {
      const client = createTenantClient();
      const res = await client.get(
        '/api/method/sopwer_hrms.api.inbox.list_published',
        { params: { limit, offset } },
      );
      const list = res.data?.message ?? [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      throw toApiError(e);
    }
  },

  async getDetail(name: string): Promise<AnnouncementDetail> {
    try {
      const client = createTenantClient();
      const res = await client.get(
        '/api/method/sopwer_hrms.api.inbox.get_detail',
        { params: { name } },
      );
      return res.data?.message as AnnouncementDetail;
    } catch (e) {
      throw toApiError(e);
    }
  },

  async countActive(): Promise<number> {
    try {
      const client = createTenantClient();
      const res = await client.get(
        '/api/method/sopwer_hrms.api.inbox.count_active',
      );
      const n = res.data?.message;
      return typeof n === 'number' ? n : 0;
    } catch {
      return 0;
    }
  },
};
