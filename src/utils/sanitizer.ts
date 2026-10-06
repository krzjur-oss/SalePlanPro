/**
 * Sanitization utility for user-generated textual content in SalePlan Pro.
 * Protects print templates, exported files, and UI components from HTML/Script injection
 * and malformed control characters while preserving Polish diacritics, dates, and formulas.
 */

/**
 * Escapes characters that have special meaning in HTML contexts.
 * Escapes exclusively: & < > " '
 * Does NOT call sanitizeText inside, and does NOT escape '/' or '`'.
 */
export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes a single string by stripping dangerous non-printable control characters
 * and normalizing whitespace.
 * DOES NOT remove HTML tags, angle brackets, or keywords like javascript:, data:, vbscript: from free text.
 */
export function sanitizeText(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }
  
  let str = String(input);

  // 1. Remove dangerous control characters (preserve normal whitespace: newline, return, tab)
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 2. Normalize whitespace (collapse multiple horizontal spaces/tabs, keep linebreaks)
  str = str.replace(/[^\S\r\n]+/g, ' ');

  return str.trim();
}

/**
 * Sanitizes URLs for safe usage in href and src attributes.
 * Allows ONLY:
 * - Absolute URLs with protocols: http:, https:, mailto:
 * - Relative URLs (/path, ./path, ../path, path/to/resource, ?query, #hash)
 * Everything else (including javascript:, data:, vbscript:, file:) returns ''.
 */
export function sanitizeUrl(input: unknown): string {
  if (input === null || input === undefined) return '';
  const url = String(input).trim().replace(/[\x00-\x1F\x7F]/g, '');
  if (!url) return '';

  // Allowed absolute protocols
  if (/^(?:https?:|mailto:)/i.test(url)) {
    return url;
  }

  // If it contains a colon before any path/query/fragment delimiter (/ ? #), it is an unknown/unsafe protocol
  const firstColon = url.indexOf(':');
  if (firstColon !== -1) {
    const firstSlash = url.indexOf('/');
    const firstQuestion = url.indexOf('?');
    const firstHash = url.indexOf('#');
    const minDelimiter = Math.min(
      firstSlash === -1 ? Infinity : firstSlash,
      firstQuestion === -1 ? Infinity : firstQuestion,
      firstHash === -1 ? Infinity : firstHash
    );
    if (firstColon < minDelimiter) {
      return '';
    }
  }

  // Allow safe relative URLs
  return url;
}

/**
 * Sanitizes print metrics and labels (school names, year labels, headers)
 * ensuring safe, bounded plain text for print headers and document titles.
 */
export function sanitizePrintMetric(input: unknown): string {
  if (input === null || input === undefined) return '';
  return sanitizeText(input).slice(0, 200);
}

/**
 * Sanitizes student educational support notes (SPE / WOPFU / IPET / Rewalidacja).
 * Ensures safe display in print templates while retaining multi-line structure and formulas.
 */
export function sanitizeStudentNotes(note: unknown): string {
  if (!note) return '';
  const clean = sanitizeText(note);
  // Truncate extreme length if payload exceeds reasonable limits (e.g. 10 000 chars)
  return clean.slice(0, 10000);
}

/**
 * Recursively cleans string properties in an object or array.
 * Does NOT modify semantic values (hashes, base64, identifiers).
 * Strictly skips prototype pollution keys (__proto__, constructor, prototype).
 */
export function sanitizeObjectStrings<T>(target: T): T {
  if (target === null || target === undefined) {
    return target;
  }

  if (typeof target === 'string') {
    // Only strip non-printable control characters, preserving semantic values intact
    return target.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') as unknown as T;
  }

  if (Array.isArray(target)) {
    return target.map(item => sanitizeObjectStrings(item)) as unknown as T;
  }

  if (typeof target === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(target)) {
      // Skip prototype keys
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      result[key] = sanitizeObjectStrings(value);
    }
    return result as T;
  }

  return target;
}
