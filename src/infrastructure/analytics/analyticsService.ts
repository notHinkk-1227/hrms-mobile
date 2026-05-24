/**
 * Analytics service — wrapper @react-native-firebase/analytics (GA4 native).
 *
 * Pattern fail-soft sama dengan pushService: dynamic require + try/catch supaya
 * build di dev environment tanpa Firebase config tetap jalan (analytics jadi
 * no-op).
 *
 * Event taxonomy (Phase 1 launch):
 * - login_success / login_failure (error_code)
 * - clock_in (verification_score, gps_accuracy_meters, is_mock_location)
 * - clock_out
 * - leave_request_submitted (leave_type)
 * - approval_action (action, doc_type)
 * - screen_view (auto via navigation listener)
 *
 * Firebase rule: event name max 40 char, [a-z0-9_]. Sanitize otomatis.
 */

const MAX_EVENT_NAME_LENGTH = 40;

function sanitizeEventName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, MAX_EVENT_NAME_LENGTH);
}

// Dynamic require — sama pattern pushService. Fail-soft kalau native module
// belum di-link (dev tanpa google-services.json).
let _analyticsModule: any | null | undefined;
function getAnalytics(): any | null {
  if (_analyticsModule !== undefined) {
    return _analyticsModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-firebase/analytics');
    const factory = mod.default || mod;
    _analyticsModule = typeof factory === 'function' ? factory() : factory;
  } catch (e) {
    console.warn('[analytics] @react-native-firebase/analytics not available:', String(e));
    _analyticsModule = null;
  }
  return _analyticsModule;
}

class AnalyticsServiceImpl {
  private enabled = true;

  /** Toggle analytics on/off (consent / opt-out). */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    const fb = getAnalytics();
    if (fb && typeof fb.setAnalyticsCollectionEnabled === 'function') {
      try {
        fb.setAnalyticsCollectionEnabled(enabled);
      } catch (e) {
        console.warn('[analytics] setAnalyticsCollectionEnabled failed:', String(e));
      }
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Log custom event. Sanitize nama otomatis (Firebase syntax). */
  async logEvent(name: string, params: Record<string, any> = {}): Promise<void> {
    if (!this.enabled) return;
    const fb = getAnalytics();
    if (!fb) return;
    try {
      await fb.logEvent(sanitizeEventName(name), params);
    } catch (e) {
      console.warn('[analytics] logEvent failed:', name, String(e));
    }
  }

  /** Set user ID setelah login. Pass null saat logout. */
  async setUserId(userId: string | null): Promise<void> {
    if (!this.enabled) return;
    const fb = getAnalytics();
    if (!fb) return;
    try {
      await fb.setUserId(userId);
    } catch (e) {
      console.warn('[analytics] setUserId failed:', String(e));
    }
  }

  /** Set user property (cohort, tenant, role, dll). */
  async setUserProperty(key: string, value: string | null): Promise<void> {
    if (!this.enabled) return;
    const fb = getAnalytics();
    if (!fb) return;
    try {
      await fb.setUserProperty(key, value);
    } catch (e) {
      console.warn('[analytics] setUserProperty failed:', key, String(e));
    }
  }

  /**
   * Log screen view. Dipanggil dari navigation listener (auto-tracking).
   * `screenClass` default sama dengan `screenName` kalau tidak di-specify.
   */
  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    if (!this.enabled) return;
    const fb = getAnalytics();
    if (!fb) return;
    try {
      await fb.logScreenView({
        screen_name: screenName,
        screen_class: screenClass ?? screenName,
      });
    } catch (e) {
      console.warn('[analytics] logScreenView failed:', screenName, String(e));
    }
  }
}

export const analytics = new AnalyticsServiceImpl();
export type AnalyticsService = AnalyticsServiceImpl;
