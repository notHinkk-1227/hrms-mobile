import { createTenantClient } from './tenantClient';
import { toApiError } from './errors';

export interface UploadedFile {
  name: string;
  file_name: string;
  file_url: string;
  file_size: number;
  is_image: 0 | 1;
  is_private: 0 | 1;
}

export interface UploadFileParams {
  uri: string;
  name: string;
  type: string;
  attachToDoctype?: string;
  attachToName?: string;
  fieldname?: string;
  isPrivate?: boolean;
}

/**
 * Upload file ke Frappe via /api/method/upload_file (multipart).
 * Untuk RN, FormData accepts object dengan `{uri, name, type}`.
 */
export async function uploadFile(params: UploadFileParams): Promise<UploadedFile> {
  try {
    const client = createTenantClient();
    const form = new FormData();
    // RN FormData accepts {uri, name, type} object — cast via unknown to bypass
    // browser FormData type which expects Blob/string.
    form.append('file', {
      uri: params.uri,
      name: params.name,
      type: params.type,
    } as unknown as Blob);
    form.append('is_private', params.isPrivate ? '1' : '0');
    form.append('folder', 'Home/Attachments');
    if (params.attachToDoctype) form.append('doctype', params.attachToDoctype);
    if (params.attachToName) form.append('docname', params.attachToName);
    if (params.fieldname) form.append('fieldname', params.fieldname);

    const response = await client.post('/api/method/upload_file', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: (data) => data,
    });
    return response.data?.message as UploadedFile;
  } catch (e) {
    throw toApiError(e);
  }
}
