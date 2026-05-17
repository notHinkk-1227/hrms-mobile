/**
 * Translator pesan error Frappe HR ke bahasa Indonesia.
 *
 * Frappe sering kirim error message dalam English (kadang dibungkus HTML tag,
 * kadang multi-line dengan "ValidationError: ..."). Translator ini:
 * 1. Strip HTML tags dan prefix exception class
 * 2. Match dengan pattern yang dikenal → return terjemahan ID
 * 3. Fallback: return cleaned message asli kalau tidak match
 */

interface TranslationRule {
  pattern: RegExp;
  id: string;
}

const RULES: TranslationRule[] = [
  // Leave Application
  {
    pattern: /application period can(?:'|&#39;)?t be outside leave allocation period/i,
    id: 'Tanggal cuti di luar periode alokasi. Hubungi HR untuk membuat alokasi cuti.',
  },
  {
    pattern: /insufficient leave balance|not sufficient leave/i,
    id: 'Sisa cuti tidak mencukupi.',
  },
  {
    pattern: /from date can(?:'|&#39;)?t be greater than to date|from date cannot be greater than to date/i,
    id: 'Tanggal mulai tidak boleh setelah tanggal selesai.',
  },
  {
    pattern: /(?:is a )?holiday on/i,
    id: 'Tanggal yang dipilih adalah hari libur.',
  },
  {
    pattern: /leave application has already been approved/i,
    id: 'Permohonan cuti sudah disetujui sebelumnya.',
  },
  {
    pattern: /already exists for|overlapping leave application/i,
    id: 'Sudah ada permohonan cuti yang tumpang tindih untuk tanggal ini.',
  },
  {
    pattern: /half day date should be in between/i,
    id: 'Tanggal setengah hari harus berada di antara tanggal mulai dan selesai.',
  },
  {
    pattern: /leave type .* is for without pay|not enough leave balance/i,
    id: 'Sisa cuti tidak mencukupi atau tipe cuti tidak diizinkan.',
  },
  // Expense Claim
  {
    pattern: /expense claim approver|approver is mandatory/i,
    id: 'Atasan untuk approval belum diset di profil Anda. Hubungi HR.',
  },
  // Generic
  {
    pattern: /mandatory|is mandatory/i,
    id: 'Ada field yang wajib diisi belum lengkap.',
  },
  {
    pattern: /permission|not permitted/i,
    id: 'Anda tidak punya akses untuk aksi ini.',
  },
  {
    pattern: /duplicate/i,
    id: 'Data duplikat. Periksa kembali isian Anda.',
  },
  // Auth / session
  {
    pattern: /sid expired|invalid login|session expired/i,
    id: 'Sesi berakhir. Silakan login kembali.',
  },
];

function stripHtml(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripExceptionPrefix(raw: string): string {
  // Frappe kadang prefix dengan "frappe.exceptions.ValidationError: " atau similar
  return raw.replace(/^[A-Za-z.]+(?:Error|Exception):\s*/g, '').trim();
}

/**
 * Translate Frappe error message ke bahasa Indonesia.
 *
 * @param rawMessage Pesan asli dari server (may contain HTML / prefix)
 * @returns Pesan dalam bahasa Indonesia (atau cleaned original kalau tidak match)
 */
export function translateFrappeError(rawMessage: string | undefined | null): string {
  if (!rawMessage) return 'Terjadi kesalahan. Coba lagi.';
  const cleaned = stripExceptionPrefix(stripHtml(rawMessage));
  for (const rule of RULES) {
    if (rule.pattern.test(cleaned)) {
      return rule.id;
    }
  }
  return cleaned;
}
