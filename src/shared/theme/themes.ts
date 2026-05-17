/**
 * Preset warna brand untuk theme picker di Profile. Cuma mutate
 * `tokens.semantic.brand` + `tokens.semantic.brandHover` — sisanya (greens,
 * yellows, dst) tetap. Ganti tema butuh restart app (tokens di-cache di
 * module level).
 */

export type ThemeKey = 'blue' | 'green' | 'purple' | 'orange' | 'dark';

export interface ThemePreset {
  key: ThemeKey;
  label: string;
  brand: string;
  brandHover: string;
}

export const THEMES: Record<ThemeKey, ThemePreset> = {
  blue: {
    key: 'blue',
    label: 'Biru Sopwer',
    brand: '#2E78D9',
    brandHover: '#1F5FB8',
  },
  green: {
    key: 'green',
    label: 'Hijau Hadir',
    brand: '#5CAB30',
    brandHover: '#468722',
  },
  purple: {
    key: 'purple',
    label: 'Ungu',
    brand: '#7C3AED',
    brandHover: '#6D28D9',
  },
  orange: {
    key: 'orange',
    label: 'Oranye',
    brand: '#EA580C',
    brandHover: '#C2410C',
  },
  dark: {
    key: 'dark',
    label: 'Gelap',
    brand: '#1E293B',
    brandHover: '#0F172A',
  },
};

export const DEFAULT_THEME: ThemeKey = 'blue';

export function isValidTheme(value: string | undefined): value is ThemeKey {
  return value === 'blue' || value === 'green' || value === 'purple' || value === 'orange' || value === 'dark';
}
