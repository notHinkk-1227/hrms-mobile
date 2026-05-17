/**
 * Sopwer Design System tokens — sumber tunggal styling Sopwer HRMS.
 * Sync rule: kalau Sopwer Design System update, update file ini juga.
 * Source: DESIGN_BRIEF.md section 4.1 + DESIGN/project/design-system/colors_and_type.css
 */

export const tokens = {
  color: {
    // Primary · Blue
    blue50: '#EAF3FC',
    blue100: '#C9DFF5',
    blue200: '#93BDEC',
    blue300: '#5C9BE2',
    blue400: '#3B86DC',
    blue500: '#2E78D9',
    blue600: '#1F5FB8',
    blue700: '#154693',
    blue800: '#0C3273',
    blue900: '#061F4D',

    // Secondary · Green
    green50: '#F0FAEB',
    green100: '#D9F1CB',
    green200: '#B6E29A',
    green300: '#91CE6A',
    green400: '#75BE45',
    green500: '#5CAB30',
    green600: '#468722',
    green700: '#346719',
    green800: '#244910',
    green900: '#162E0A',

    // Accent · Yellow
    yellow50: '#FFF8E1',
    yellow100: '#FFEDB3',
    yellow200: '#FFDC75',
    yellow300: '#FFC93C',
    yellow400: '#FBB217',
    yellow500: '#E69408',
    yellow600: '#BD7806',
    yellow700: '#935C04',
    yellow800: '#6B4203',
    yellow900: '#432901',

    // Ink / Neutral
    ink900: '#0B1220',
    ink800: '#0F172A',
    ink700: '#1F2937',
    ink600: '#374151',
    ink500: '#475569',
    ink400: '#64748B',
    ink300: '#94A3B8',
    ink200: '#CBD5E1',
    ink100: '#E2E8F0',
    ink50: '#F1F5F9',
    paper: '#F8FAFC',
    white: '#FFFFFF',
    black: '#000000',

    // Semantic
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#DC2626',
    errorTint: '#FEE2E2',
    info: '#2E78D9',
  },

  semantic: {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surface2: '#F1F5F9',
    fg1: '#0B1220',
    fg2: '#1F2937',
    fg3: '#475569',
    fg4: '#64748B',
    line: '#E2E8F0',
    lineStrong: '#CBD5E1',
    brand: '#2E78D9',
    brandHover: '#1F5FB8',
  },

  font: {
    display: 'Manrope',
    body: 'Inter',
    mono: 'JetBrainsMono',
  },

  fontSize: {
    displayXl: 88,
    display: 64,
    timeHero: 56, // ClockInHero clock display
    timeLarge: 48, // ClockInSuccess / CheckinDetail jam besar
    h1: 36,
    h2: 22,
    h3: 18,
    h4: 16,
    lede: 18,
    body: 15,
    small: 13,
    caption: 12,
    eyebrow: 11,
    monoSm: 11,
  },

  lineHeight: {
    timeHero: 60,
    timeLarge: 52,
    body: 22,
    small: 20,
  },

  iconSize: {
    sm: 14,
    md: 18,
    lg: 24,
    xl: 32,
  },

  touchTarget: {
    min: 44,
    comfortable: 48,
  },

  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  spacing: {
    sp1: 4,
    sp1_5: 6,
    sp2: 8,
    sp3: 13,
    sp4: 21,
    sp5: 34,
    sp6: 55,
    sp7: 89,
    sp8: 144,
    sp9: 233,
    formCtaSpace: 88, // paddingBottom scroll content saat ada StickyCta
  },

  radius: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  shadow: {
    sm: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 4,
    },
    lg: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 40,
      elevation: 12,
    },
  },

  motion: {
    durationMicro: 120,
    durationUi: 240,
    durationEmph: 400,
    easeOutCubic: [0.16, 1, 0.3, 1] as const,
    easeInOutCubic: [0.65, 0, 0.35, 1] as const,
  },
} as const;

export type Tokens = typeof tokens;

// === Theme override saat module load ===
// Baca preset theme yang dipilih user dari MMKV, mutate semantic.brand +
// brandHover. Ini cuma jalan sekali pas modul di-import pertama kali — ganti
// tema dari Profile butuh restart app.
import { persist, StorageKeys } from '@infrastructure/storage/mmkv';
import { THEMES, isValidTheme } from './themes';

const storedTheme = persist.getString(StorageKeys.THEME);
if (isValidTheme(storedTheme)) {
  const preset = THEMES[storedTheme];
  // Cast karena `as const` di atas bikin field readonly di TS — runtime tetap
  // mutable.
  (tokens.semantic as { brand: string }).brand = preset.brand;
  (tokens.semantic as { brandHover: string }).brandHover = preset.brandHover;
}
