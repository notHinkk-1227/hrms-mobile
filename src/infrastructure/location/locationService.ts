import Geolocation from 'react-native-geolocation-service';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';
import type { LocationPort } from '@domain/ports/location';
import type { Coordinate } from '@domain/entities/checkin';

const FINE_LOCATION =
  Platform.OS === 'android'
    ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
    : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;

const DEFAULT_TIMEOUT_MS = 10_000;

export class LocationPermissionError extends Error {
  constructor() {
    super('GPS permission denied');
    this.name = 'LocationPermissionError';
  }
}

export class LocationTimeoutError extends Error {
  constructor() {
    super('GPS timeout — coba di tempat terbuka');
    this.name = 'LocationTimeoutError';
  }
}

export class LocationUnavailableError extends Error {
  constructor(message = 'GPS tidak tersedia') {
    super(message);
    this.name = 'LocationUnavailableError';
  }
}

export const locationService: LocationPort = {
  async hasPermission(): Promise<boolean> {
    const status = await check(FINE_LOCATION);
    return status === RESULTS.GRANTED;
  },

  async requestPermission(): Promise<boolean> {
    const current = await check(FINE_LOCATION);
    if (current === RESULTS.GRANTED) return true;
    if (current === RESULTS.BLOCKED) return false;
    const result = await request(FINE_LOCATION);
    return result === RESULTS.GRANTED;
  },

  getCurrentPosition({ timeoutMs }: { timeoutMs?: number } = {}): Promise<Coordinate> {
    const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyMeters: pos.coords.accuracy ?? 9999,
          });
        },
        (err) => {
          if (err.code === 1) {
            reject(new LocationPermissionError());
          } else if (err.code === 3) {
            reject(new LocationTimeoutError());
          } else {
            reject(new LocationUnavailableError(err.message));
          }
        },
        {
          enableHighAccuracy: true,
          timeout,
          maximumAge: 0,
          forceRequestLocation: true,
          showLocationDialog: true,
        },
      );
    });
  },
};
