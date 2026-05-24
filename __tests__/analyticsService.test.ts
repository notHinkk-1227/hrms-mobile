/**
 * @format
 * Unit tests untuk analyticsService — wrapper @react-native-firebase/analytics.
 *
 * Mock @react-native-firebase/analytics jadi tidak butuh native module di-link.
 * Service pakai dynamic require + fail-soft (sama pattern pushService).
 */

const mockLogEvent = jest.fn().mockResolvedValue(undefined);
const mockSetUserId = jest.fn().mockResolvedValue(undefined);
const mockSetUserProperty = jest.fn().mockResolvedValue(undefined);
const mockLogScreenView = jest.fn().mockResolvedValue(undefined);
const mockSetAnalyticsCollectionEnabled = jest.fn().mockResolvedValue(undefined);

jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  default: () => ({
    logEvent: mockLogEvent,
    setUserId: mockSetUserId,
    setUserProperty: mockSetUserProperty,
    logScreenView: mockLogScreenView,
    setAnalyticsCollectionEnabled: mockSetAnalyticsCollectionEnabled,
  }),
}), { virtual: true });

import { analytics } from '@infrastructure/analytics';

describe('analyticsService', () => {
  beforeEach(() => {
    mockLogEvent.mockClear();
    mockSetUserId.mockClear();
    mockSetUserProperty.mockClear();
    mockLogScreenView.mockClear();
    mockSetAnalyticsCollectionEnabled.mockClear();
    analytics.setEnabled(true);
  });

  describe('logEvent', () => {
    test('forwards event name + params ke Firebase Analytics', async () => {
      await analytics.logEvent('clock_in', {
        verification_score: 85,
        gps_accuracy_meters: 12.5,
      });
      expect(mockLogEvent).toHaveBeenCalledTimes(1);
      expect(mockLogEvent).toHaveBeenCalledWith('clock_in', {
        verification_score: 85,
        gps_accuracy_meters: 12.5,
      });
    });

    test('safe panggil tanpa params (defaults ke empty)', async () => {
      await analytics.logEvent('app_open');
      expect(mockLogEvent).toHaveBeenCalledWith('app_open', {});
    });

    test('skip kalau disabled', async () => {
      analytics.setEnabled(false);
      await analytics.logEvent('clock_out');
      expect(mockLogEvent).not.toHaveBeenCalled();
    });

    test('sanitize event name (huruf kecil + underscore, max 40 char)', async () => {
      // Firebase rule: event name max 40 char, alpha-numeric + underscore.
      await analytics.logEvent('Some Event-With Spaces');
      expect(mockLogEvent).toHaveBeenCalledWith(
        'some_event_with_spaces',
        {},
      );
    });

    test('fail-soft kalau Firebase native module throw', async () => {
      mockLogEvent.mockRejectedValueOnce(new Error('Native module not linked'));
      // Tidak boleh throw — caller di screen handler tidak peduli analytics fail.
      await expect(
        analytics.logEvent('test_event'),
      ).resolves.toBeUndefined();
    });
  });

  describe('setUserId', () => {
    test('forwards user_id ke Firebase', async () => {
      await analytics.setUserId('HR-EMP-00007');
      expect(mockSetUserId).toHaveBeenCalledWith('HR-EMP-00007');
    });

    test('null clears user (logout)', async () => {
      await analytics.setUserId(null);
      expect(mockSetUserId).toHaveBeenCalledWith(null);
    });

    test('skip kalau disabled', async () => {
      analytics.setEnabled(false);
      await analytics.setUserId('HR-EMP-X');
      expect(mockSetUserId).not.toHaveBeenCalled();
    });
  });

  describe('setUserProperty', () => {
    test('forwards property key + value', async () => {
      await analytics.setUserProperty('tenant', 'acme');
      expect(mockSetUserProperty).toHaveBeenCalledWith('tenant', 'acme');
    });

    test('skip kalau disabled', async () => {
      analytics.setEnabled(false);
      await analytics.setUserProperty('foo', 'bar');
      expect(mockSetUserProperty).not.toHaveBeenCalled();
    });
  });

  describe('logScreenView', () => {
    test('forwards screen_name + screen_class default', async () => {
      await analytics.logScreenView('LoginScreen');
      expect(mockLogScreenView).toHaveBeenCalledWith({
        screen_name: 'LoginScreen',
        screen_class: 'LoginScreen',
      });
    });

    test('screen_class override', async () => {
      await analytics.logScreenView('Dashboard', 'TabNavigator');
      expect(mockLogScreenView).toHaveBeenCalledWith({
        screen_name: 'Dashboard',
        screen_class: 'TabNavigator',
      });
    });

    test('skip kalau disabled', async () => {
      analytics.setEnabled(false);
      await analytics.logScreenView('Hidden');
      expect(mockLogScreenView).not.toHaveBeenCalled();
    });
  });

  describe('setEnabled', () => {
    test('false propagate ke Firebase setAnalyticsCollectionEnabled', () => {
      analytics.setEnabled(false);
      expect(mockSetAnalyticsCollectionEnabled).toHaveBeenCalledWith(false);
    });

    test('true re-enable Firebase collection', () => {
      analytics.setEnabled(false);
      analytics.setEnabled(true);
      expect(mockSetAnalyticsCollectionEnabled).toHaveBeenLastCalledWith(true);
    });

    test('isEnabled() reflect state', () => {
      analytics.setEnabled(false);
      expect(analytics.isEnabled()).toBe(false);
      analytics.setEnabled(true);
      expect(analytics.isEnabled()).toBe(true);
    });
  });
});
