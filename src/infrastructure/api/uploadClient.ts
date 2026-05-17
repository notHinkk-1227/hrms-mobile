import { persist, StorageKeys } from '@infrastructure/storage/mmkv';
import { NotAuthenticatedError } from './tenantClient';

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
 *
 * Pakai XMLHttpRequest — bukan fetch maupun axios — karena di React Native:
 * 1. XHR + FormData multipart boundary di-handle native module (paling reliable).
 * 2. `fetch()` sering tidak preserve `{uri, name, type}` Blob shape di RN.
 * 3. axios + tenantClient default Content-Type 'application/json' bentrok.
 */
export function uploadFile(params: UploadFileParams): Promise<UploadedFile> {
  return new Promise<UploadedFile>((resolve, reject) => {
    const tenantUrl = persist.getString(StorageKeys.TENANT_URL);
    const apiKey = persist.getString(StorageKeys.AUTH_API_KEY);
    const apiSecret = persist.getString(StorageKeys.AUTH_API_SECRET);
    if (!tenantUrl) {
      reject(new NotAuthenticatedError());
      return;
    }

    const form = new FormData();
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

    const url = tenantUrl.replace(/\/$/, '') + '/api/method/upload_file';
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Accept', 'application/json');
    if (apiKey && apiSecret) {
      xhr.setRequestHeader('Authorization', `token ${apiKey}:${apiSecret}`);
    }
    // JANGAN setRequestHeader Content-Type — XHR auto-set multipart + boundary

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const message = data?.message as UploadedFile | undefined;
          if (!message?.file_url) {
            reject(new Error('Upload sukses tapi response tanpa file_url'));
            return;
          }
          resolve(message);
        } catch (e) {
          reject(new Error(`Parse response gagal: ${(e as Error).message}`));
        }
      } else {
        // Truncate response body untuk log
        const body = (xhr.responseText || '').slice(0, 300);
        reject(new Error(`Upload gagal (HTTP ${xhr.status}): ${body}`));
      }
    };
    xhr.onerror = () => {
      reject(new Error(`Network error saat upload (status ${xhr.status})`));
    };
    xhr.ontimeout = () => {
      reject(new Error('Upload timeout — coba lagi'));
    };
    xhr.timeout = 60_000;

    xhr.send(form);
  });
}
