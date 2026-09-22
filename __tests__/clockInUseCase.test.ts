/**
 * @format
 * Unit test untuk logic anti-spoofing di ClockInUseCase.submit().
 *
 * Cover:
 * - verdict 'Fail' -> hard block, outcome spoof_detected, TIDAK panggil checkinPort
 * - verdict 'Unknown' -> fail-open, tetap lanjut submit normal
 * - verdict 'Pass' -> lanjut submit normal, faceLiveness ikut ke payload
 * - tidak ada faceLiveness sama sekali (undefined) -> tetap lanjut (backward compatible)
 */

import { ClockInUseCase, ClockInPreview } from '@domain/usecases/clockIn';
import type { ClockInUseCaseDeps, ClockInUseCaseInput } from '@domain/usecases/clockIn';
import type { LivenessSignals } from '@domain/entities/checkin';

function makeDeps(overrides: Partial<ClockInUseCaseDeps> = {}): ClockInUseCaseDeps {
  return {
    locationPort: {
      requestPermission: jest.fn().mockResolvedValue(true),
      hasPermission: jest.fn().mockResolvedValue(true),
      getCurrentPosition: jest.fn(),
    },
    checkinPort: {
      getAllowedLocations: jest.fn().mockResolvedValue([]),
      submitClockIn: jest.fn().mockResolvedValue({
        name: 'CHK-001',
        verificationStatus: 'Verified',
        verificationScore: 90,
        serverTimestamp: '2026-01-01T00:00:00.000Z',
      }),
      submitClockOut: jest.fn(),
    },
    fetchAllowedLocations: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makePreview(): ClockInPreview {
  return {
    coordinate: { latitude: -6.2, longitude: 106.8, accuracyMeters: 10 },
    nearest: null, // tidak ada lokasi terdaftar -> tidak kena geofence block
    allowedLocations: [],
  };
}

function makeInput(
  faceLiveness: LivenessSignals | undefined,
): ClockInUseCaseInput {
  return {
    logType: 'IN',
    employee: 'EMP-0001',
    deviceId: 'dev-abc',
    deviceFingerprint: 'fp-123',
    selfieBase64: 'data:image/jpeg;base64,xxx',
    integrity: {
      isMockLocation: false,
      isRootedDevice: false,
      playIntegrityVerdict: 'Pass',
      faceLiveness,
    },
  };
}

describe('ClockInUseCase.submit — anti-spoofing (liveness) blocking', () => {
  test("verdict 'Fail' -> hard block, TIDAK panggil checkinPort", async () => {
    const deps = makeDeps();
    const useCase = new ClockInUseCase(deps);
    const liveness: LivenessSignals = { isLive: false, score: 0.12, verdict: 'Fail' };

    const outcome = await useCase.submit(makeInput(liveness), makePreview());

    expect(outcome.kind).toBe('spoof_detected');
    if (outcome.kind === 'spoof_detected') {
      expect(outcome.liveness).toEqual(liveness);
    }
    expect(deps.checkinPort.submitClockIn).not.toHaveBeenCalled();
  });

  test("verdict 'NoFace' -> hard block juga, TIDAK panggil checkinPort", async () => {
    const deps = makeDeps();
    const useCase = new ClockInUseCase(deps);
    const liveness: LivenessSignals = { isLive: false, score: 0, verdict: 'NoFace' };

    const outcome = await useCase.submit(makeInput(liveness), makePreview());

    expect(outcome.kind).toBe('spoof_detected');
    if (outcome.kind === 'spoof_detected') {
      expect(outcome.liveness.verdict).toBe('NoFace');
    }
    expect(deps.checkinPort.submitClockIn).not.toHaveBeenCalled();
  });

  test("verdict 'Unknown' -> fail-open, tetap submit normal", async () => {
    const deps = makeDeps();
    const useCase = new ClockInUseCase(deps);
    const liveness: LivenessSignals = { isLive: false, score: 0, verdict: 'Unknown' };

    const outcome = await useCase.submit(makeInput(liveness), makePreview());

    expect(outcome.kind).toBe('success');
    expect(deps.checkinPort.submitClockIn).toHaveBeenCalledTimes(1);
  });

  test("verdict 'Pass' -> submit normal, faceLiveness ikut ke payload", async () => {
    const deps = makeDeps();
    const useCase = new ClockInUseCase(deps);
    const liveness: LivenessSignals = { isLive: true, score: 0.93, verdict: 'Pass' };

    const outcome = await useCase.submit(makeInput(liveness), makePreview());

    expect(outcome.kind).toBe('success');
    const [payload] = (deps.checkinPort.submitClockIn as jest.Mock).mock.calls[0];
    expect(payload.integrity.faceLiveness).toEqual(liveness);
  });

  test('tanpa faceLiveness sama sekali (undefined) -> tetap lanjut, backward compatible', async () => {
    const deps = makeDeps();
    const useCase = new ClockInUseCase(deps);

    const outcome = await useCase.submit(makeInput(undefined), makePreview());

    expect(outcome.kind).toBe('success');
    expect(deps.checkinPort.submitClockIn).toHaveBeenCalledTimes(1);
  });
});

describe('ClockInUseCase.submit — LIVENESS_FAIL_OPEN=false (fail-closed)', () => {
  // LIVENESS_FAIL_OPEN di-mock false di sini untuk verifikasi cabang
  // fail-closed benar-benar dibaca dari config, bukan hardcoded di use case.
  // Constant asli di config/liveness.ts tetap true (default production).
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('@config/liveness', () => ({ LIVENESS_FAIL_OPEN: false }));
  });

  afterEach(() => {
    jest.dontMock('@config/liveness');
  });

  test("verdict 'Unknown' + LIVENESS_FAIL_OPEN=false -> ikut hard block", async () => {
    // Re-require setelah mock supaya clockIn.ts baca LIVENESS_FAIL_OPEN versi
    // mock. Pakai require() sinkron (bukan dynamic import()) karena transform
    // Babel proyek ini CommonJS -- dynamic import butuh flag experimental
    // yang tidak diaktifkan di konfigurasi Jest proyek.
    const { ClockInUseCase: MockedClockInUseCase } = require('@domain/usecases/clockIn');
    const deps = makeDeps();
    const useCase = new MockedClockInUseCase(deps);
    const liveness: LivenessSignals = { isLive: false, score: 0, verdict: 'Unknown' };

    const outcome = await useCase.submit(makeInput(liveness), makePreview());

    expect(outcome.kind).toBe('spoof_detected');
    expect(deps.checkinPort.submitClockIn).not.toHaveBeenCalled();
  });
});