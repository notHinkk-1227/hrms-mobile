import { persist, StorageKeys } from '@infrastructure/storage/mmkv';

const MAX_ATTEMPTS = 7;
const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 2 * 60 * 1000;

interface FailedRecord {
  count: number;
  firstAt: number;
}

export function isLocked(): { locked: boolean; remainingMs: number } {
  const until = persist.getNumber(StorageKeys.LOGIN_LOCK_UNTIL) ?? 0;
  const now = Date.now();
  if (until > now) {
    return { locked: true, remainingMs: until - now };
  }
  return { locked: false, remainingMs: 0 };
}

export function recordFailedAttempt(): { locked: boolean; remainingMs: number } {
  const record = persist.getObject<FailedRecord>(StorageKeys.LOGIN_FAILED_ATTEMPTS) ?? { count: 0, firstAt: Date.now() };
  const now = Date.now();
  if (now - record.firstAt > WINDOW_MS) {
    record.count = 1;
    record.firstAt = now;
  } else {
    record.count += 1;
  }
  persist.setObject(StorageKeys.LOGIN_FAILED_ATTEMPTS, record);
  if (record.count >= MAX_ATTEMPTS) {
    const lockUntil = now + LOCK_MS;
    persist.setNumber(StorageKeys.LOGIN_LOCK_UNTIL, lockUntil);
    persist.delete(StorageKeys.LOGIN_FAILED_ATTEMPTS);
    return { locked: true, remainingMs: LOCK_MS };
  }
  return { locked: false, remainingMs: 0 };
}

export function clearFailedAttempts(): void {
  persist.delete(StorageKeys.LOGIN_FAILED_ATTEMPTS);
  persist.delete(StorageKeys.LOGIN_LOCK_UNTIL);
}
