import { io, Socket } from 'socket.io-client';
import { persist, StorageKeys } from '@infrastructure/storage/mmkv';

/**
 * Frappe socket.io adapter. Frappe publish event `notification` ke user
 * tertentu lewat `frappe.publish_realtime('notification', user=email)` —
 * dipanggil otomatis saat Notification Log dibuat (assign task, leave
 * approved, dst).
 *
 * Auth: pakai Authorization header pas handshake. Untuk versi Frappe yang
 * tidak terima header di websocket, fallback ke polling transport + cookie.
 *
 * Reconnect: socket.io-client default reconnect dengan exponential backoff —
 * cukup untuk drop koneksi sesaat (network jelek, app background).
 */

export type RealtimeEvent =
  | { type: 'notification'; data: unknown }
  | { type: 'connected' }
  | { type: 'disconnected' };

export type RealtimeListener = (event: RealtimeEvent) => void;

class RealtimeService {
  private socket: Socket | null = null;
  private listeners = new Set<RealtimeListener>();

  connect(): void {
    if (this.socket?.connected) return;
    const tenantUrl = persist.getString(StorageKeys.TENANT_URL);
    const apiKey = persist.getString(StorageKeys.AUTH_API_KEY);
    const apiSecret = persist.getString(StorageKeys.AUTH_API_SECRET);
    if (!tenantUrl) {
      console.log('[realtime] skip connect: no tenantUrl');
      return;
    }

    const authHeader =
      apiKey && apiSecret ? `token ${apiKey}:${apiSecret}` : undefined;
    const target = tenantUrl.replace(/\/$/, '');
    console.log(`[realtime] connecting to ${target} (auth=${authHeader ? 'token' : 'none'})`);

    this.socket = io(target, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30_000,
      timeout: 10_000,
      extraHeaders: authHeader ? { Authorization: authHeader } : undefined,
    });

    this.socket.on('connect', () => {
      console.log(`[realtime] CONNECTED id=${this.socket?.id}`);
      this.emit({ type: 'connected' });
    });
    this.socket.on('connect_error', (err) => {
      console.log('[realtime] connect_error:', err.message);
    });
    this.socket.on('disconnect', (reason) => {
      console.log('[realtime] disconnected:', reason);
      this.emit({ type: 'disconnected' });
    });
    this.socket.on('notification', (data: unknown) => {
      console.log('[realtime] notification event:', JSON.stringify(data).slice(0, 200));
      this.emit({ type: 'notification', data });
    });
    // Frappe juga publish via event `msgprint` dan custom event nama. Dengarkan
    // wildcard untuk debugging.
    this.socket.onAny((eventName: string, ...args: unknown[]) => {
      console.log(`[realtime] event: ${eventName}`, JSON.stringify(args).slice(0, 200));
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: RealtimeEvent): void {
    this.listeners.forEach((l) => {
      try {
        l(event);
      } catch {
        // ignore listener errors
      }
    });
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const realtimeService = new RealtimeService();
