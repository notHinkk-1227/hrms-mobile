/**
 * URL helpers — pure functions, no RN imports.
 */

/** Extract hostname dari URL (untuk display). "https://tenant.sopwer.cloud/api" → "tenant.sopwer.cloud" */
export function getHost(url: string | null | undefined): string {
  if (!url) return '';
  // Pakai regex parser; RN URL polyfill belum punya .host property
  const match = url.match(/^[a-z]+:\/\/([^/?#]+)/i);
  if (match) return match[1] ?? '';
  return url.replace(/^https?:\/\//, '').split('/')[0] ?? '';
}

/** Truncate URL untuk display di space sempit. "https://tenant-name.sopwer.cloud" → "tenant-…sopwer.cloud" */
export function truncateUrl(url: string | null | undefined, maxLen = 32): string {
  const host = getHost(url);
  if (host.length <= maxLen) return host;
  const head = Math.floor((maxLen - 1) / 2);
  const tail = maxLen - 1 - head;
  return `${host.slice(0, head)}…${host.slice(-tail)}`;
}
