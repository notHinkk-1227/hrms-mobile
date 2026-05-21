/**
 * @format
 * Unit test untuk dual-mode dispatch + vanilla payload shape di checkinClient.
 *
 * Cover (per plan dual-mode hardening 2026-05-21):
 * - hasSopwerHrms=false dispatch ke vanilla path (POST /api/resource/Employee Checkin)
 * - vanilla body include client_uuid (Frappe abaikan, mobile-side dedup)
 * - hasSopwerHrms=true dispatch ke enhanced path (POST sopwer_hrms.api.mobile.clock_in)
 * - sentUuids dedup throw AlreadySentError saat UUID kedua kalinya
 * - addReasonComment POST Comment ke endpoint frappe.client.insert
 */

import type { ClockInPayload } from '@domain/entities/checkin';

const mockPost = jest.fn();
const mockGet = jest.fn();

jest.mock('@infrastructure/api/tenantClient', () => ({
  createTenantClient: jest.fn(() => ({ post: mockPost, get: mockGet })),
  NotAuthenticatedError: class NotAuthenticatedError extends Error {},
}));

jest.mock('@infrastructure/api/featureDetect', () => ({
  useFeaturesStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@infrastructure/api/employeeClient', () => ({
  getAllowedLocationsForToday: jest.fn().mockResolvedValue([]),
}));

const { useFeaturesStore } = require('@infrastructure/api/featureDetect');
const {
  addReasonComment,
  checkinClient,
  AlreadySentError,
} = require('@infrastructure/api/checkinClient');
const { _resetSentUuidsForTest } = require('@infrastructure/persistence/sentUuids');

function makePayload(overrides: Partial<ClockInPayload> = {}): ClockInPayload & { employee: string } {
  return {
    employee: 'EMP-0001',
    logType: 'IN',
    coordinate: { latitude: -6.2, longitude: 106.8, accuracyMeters: 10 },
    integrity: { isMockLocation: false, isRootedDevice: false, playIntegrityVerdict: 'Pass' },
    device: { deviceId: 'dev-abc', deviceFingerprint: 'fp-123' },
    selfieBase64: '',
    clientTimestamp: '2026-05-21T08:30:00.000Z',
    clientUuid: 'uuid-fresh-1',
    reasonOutsideLocation: undefined,
    ...overrides,
  } as ClockInPayload & { employee: string };
}

describe('checkinClient — dual-mode dispatch', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockReset();
    _resetSentUuidsForTest();
  });

  test('vanilla mode: dispatch ke /api/resource/Employee Checkin dengan client_uuid', async () => {
    useFeaturesStore.getState.mockReturnValue({ features: { hasSopwerHrms: false } });
    mockPost.mockResolvedValue({
      data: { data: { name: 'CHK-VANILLA-001', time: '2026-05-21 08:30:00' } },
    });

    const result = await checkinClient.submitClockIn(makePayload());

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, body] = mockPost.mock.calls[0];
    expect(url).toBe('/api/resource/Employee Checkin');
    expect(body).toMatchObject({
      employee: 'EMP-0001',
      log_type: 'IN',
      latitude: -6.2,
      longitude: 106.8,
      device_id: 'dev-abc',
      client_uuid: 'uuid-fresh-1',
    });
    expect(result.name).toBe('CHK-VANILLA-001');
    expect(result.verificationStatus).toBe('Verified');
  });

  test('enhanced mode: dispatch ke sopwer_hrms.api.mobile.clock_in', async () => {
    useFeaturesStore.getState.mockReturnValue({ features: { hasSopwerHrms: true } });
    mockPost.mockResolvedValue({
      data: {
        message: { name: 'CHK-ENH-001', verification_status: 'Verified', verification_score: 95 },
      },
    });

    await checkinClient.submitClockIn(makePayload({ clientUuid: 'uuid-fresh-2' }));

    const [url] = mockPost.mock.calls[0];
    expect(url).toBe('/api/method/sopwer_hrms.api.mobile.clock_in');
  });

  test('dedup: panggil kedua kali dengan UUID sama → throw AlreadySentError', async () => {
    useFeaturesStore.getState.mockReturnValue({ features: { hasSopwerHrms: false } });
    mockPost.mockResolvedValue({ data: { data: { name: 'CHK-DEDUP-001' } } });

    await checkinClient.submitClockIn(makePayload({ clientUuid: 'uuid-dedup' }));
    expect(mockPost).toHaveBeenCalledTimes(1);

    await expect(
      checkinClient.submitClockIn(makePayload({ clientUuid: 'uuid-dedup' })),
    ).rejects.toBeInstanceOf(AlreadySentError);
    // Network call kedua tidak boleh terjadi
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  test('clock-out: dispatch ke clock_out endpoint enhanced', async () => {
    useFeaturesStore.getState.mockReturnValue({ features: { hasSopwerHrms: true } });
    mockPost.mockResolvedValue({ data: { message: { name: 'CHK-OUT-001' } } });

    await checkinClient.submitClockOut(makePayload({ logType: 'OUT', clientUuid: 'uuid-out-1' }));

    const [url] = mockPost.mock.calls[0];
    expect(url).toBe('/api/method/sopwer_hrms.api.mobile.clock_out');
  });
});

describe('addReasonComment', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  test('POST ke /api/method/frappe.client.insert dengan Comment payload', async () => {
    mockPost.mockResolvedValue({ data: {} });
    await addReasonComment('CHK-001', 'Macet di tol');

    expect(mockPost).toHaveBeenCalledWith('/api/method/frappe.client.insert', {
      doc: {
        doctype: 'Comment',
        comment_type: 'Info',
        reference_doctype: 'Employee Checkin',
        reference_name: 'CHK-001',
        content: 'Alasan di luar lokasi: Macet di tol',
      },
    });
  });

  test('skip ketika reason kosong atau checkinName kosong', async () => {
    await addReasonComment('', 'reason here');
    await addReasonComment('CHK-001', '');
    await addReasonComment('CHK-001', '   ');
    expect(mockPost).not.toHaveBeenCalled();
  });
});
