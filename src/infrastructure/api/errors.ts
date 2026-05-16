import { AxiosError } from 'axios';

export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'server'
  | 'validation'
  | 'unknown';

export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    message: string,
    public status?: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  const axErr = error as AxiosError<{ message?: string; exception?: string }>;
  if (axErr?.isAxiosError) {
    if (axErr.code === 'ECONNABORTED') {
      return new ApiError('timeout', 'Permintaan terlalu lama');
    }
    if (!axErr.response) {
      return new ApiError('network', 'Tidak ada koneksi');
    }
    const status = axErr.response.status;
    const data = axErr.response.data;
    const serverMsg = data?.message || data?.exception || axErr.message;
    if (status === 401) {
      return new ApiError('unauthorized', serverMsg ?? 'Sesi berakhir', status, data);
    }
    if (status === 403) {
      return new ApiError('forbidden', serverMsg ?? 'Akses ditolak', status, data);
    }
    if (status === 404) {
      return new ApiError('not_found', serverMsg ?? 'Tidak ditemukan', status, data);
    }
    if (status >= 500) {
      return new ApiError('server', serverMsg ?? 'Server bermasalah', status, data);
    }
    if (status >= 400) {
      return new ApiError('validation', serverMsg ?? 'Data tidak valid', status, data);
    }
  }
  const msg = error instanceof Error ? error.message : 'Terjadi kesalahan';
  return new ApiError('unknown', msg);
}
