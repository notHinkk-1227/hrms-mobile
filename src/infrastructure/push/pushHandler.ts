/**
 * Push notification message handler — parse remoteMessage dari FCM dan
 * convert ke aksi UI: deep link navigation, badge refresh, toast.
 *
 * Format payload dari sopwer_hrms (lihat api/push.py):
 * - `event_type`: 'inbox' | 'task' | 'request' | 'notif'
 * - `name`: nama dokumen / record
 * - `doctype`: untuk request (Leave Application / Expense Claim / Employee Advance)
 * - `click_action`: relative URL untuk deep link
 *
 * Foreground behavior: notifikasi TIDAK tampil di system tray (RN Firebase
 * default). Kita tampilkan toast + trigger UI refresh sesuai event_type.
 *
 * Background tap: app dibuka langsung navigate ke screen yang sesuai.
 */
import { NavigationContainerRef, CommonActions } from '@react-navigation/native';

export type PushEventType = 'inbox' | 'task' | 'request' | 'notif' | 'unknown';

export interface PushMessage {
  title: string;
  body: string;
  eventType: PushEventType;
  name: string | null;
  doctype: string | null;
  clickAction: string | null;
  raw: any;
}

export function parsePushMessage(remoteMessage: any): PushMessage {
  const notification = remoteMessage?.notification || {};
  const data = remoteMessage?.data || {};
  const rawEvent = typeof data.event_type === 'string' ? data.event_type : '';
  const eventType: PushEventType =
    rawEvent === 'inbox' ||
    rawEvent === 'task' ||
    rawEvent === 'request' ||
    rawEvent === 'notif'
      ? rawEvent
      : 'unknown';
  return {
    title: notification.title || data.title || '',
    body: notification.body || data.body || '',
    eventType,
    name: typeof data.name === 'string' ? data.name : null,
    doctype: typeof data.doctype === 'string' ? data.doctype : null,
    clickAction: typeof data.click_action === 'string' ? data.click_action : null,
    raw: remoteMessage,
  };
}

/**
 * Navigate berdasarkan eventType. Caller perlu pass navigation ref dari
 * RootNavigator yang sudah ready (current state non-null).
 */
export function navigateFromPush(
  navRef: NavigationContainerRef<any> | null,
  msg: PushMessage,
): boolean {
  if (!navRef || !navRef.isReady()) return false;
  try {
    switch (msg.eventType) {
      case 'inbox': {
        if (msg.name) {
          navRef.dispatch(
            CommonActions.navigate({
              name: 'InboxDetail',
              params: { name: msg.name },
            }),
          );
        } else {
          navRef.dispatch(CommonActions.navigate({ name: 'Inbox' }));
        }
        return true;
      }
      case 'task': {
        navRef.dispatch(
          CommonActions.navigate({
            name: 'Tabs',
            params: { screen: 'Task' },
          }),
        );
        return true;
      }
      case 'request': {
        if (msg.doctype && msg.name) {
          navRef.dispatch(
            CommonActions.navigate({
              name: 'RequestDetail',
              params: { doctype: msg.doctype, name: msg.name },
            }),
          );
        } else {
          navRef.dispatch(
            CommonActions.navigate({
              name: 'Tabs',
              params: { screen: 'MyRequests' },
            }),
          );
        }
        return true;
      }
      default:
        return false;
    }
  } catch (e) {
    console.warn('[push] navigate failed:', String(e));
    return false;
  }
}
