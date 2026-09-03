/**
 * Sanitization utility for user-generated textual content in SalePlan Pro.
 * Protects print templates, exported files, and UI components from HTML/Script injection
 * and malformed control characters while preserving Polish diacritics and formatting.
 */

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;'
};

/**
 * Sanitizes a single string by stripping dangerous HTML tags, script elements,
 * event attributes (e.g. onload=, onerror=), and JavaScript pseudo-protocols.
 */
export function sanitizeText(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }
  
  let str = String(input);

  // 1. Remove dangerous control characters (preserve normal whitespace: newline, return, tab)
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 2. Strip dangerous tags completely along with their contents
  str = str.replace(/<\s*(?:script|iframe|object|embed|style|meta|link|base|form|svg)[\s\S]*?(?:<\s*\/\s*(?:script|iframe|object|embed|style|meta|link|base|form|svg)\s*>|$)/gi, '');

  // 3. Strip all other HTML tags while keeping their inner text
  str = str.replace(/<[^>]+>/g, '');

  // 4. Strip dangerous pseudo-protocols in case text is placed in href/src
  str = str.replace(/(?:javascript|data|vbscript)\s*:/gi, '');

  // 5. Trim extraneous control whitespace but preserve reasonable spacing
  return str.trim();
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
 * Escapes characters that have special meaning in HTML contexts.
 * Useful when injecting text into raw HTML strings or print documents.
 */
export function escapeHtml(input: unknown): string {
  const clean = sanitizeText(input);
  return clean.replace(/[&<>"'`/]/g, char => HTML_ENTITIES[char] || char);
}

/**
 * Sanitizes student educational support notes (SPE / WOPFU / IPET / Rewalidacja).
 * Ensures safe display in print templates while retaining multi-line structure.
 */
export function sanitizeStudentNotes(note: unknown): string {
  if (!note) return '';
  const clean = sanitizeText(note);
  // Truncate extreme malicious length if payload exceeds reasonable limits (e.g. 10 000 chars)
  return clean.slice(0, 10000);
}

/**
 * Recursively cleans all string properties in an object or array.
 * Safe for state objects, print headers, and export payloads.
 */
export function sanitizeObjectStrings<T>(target: T): T {
  if (target === null || target === undefined) {
    return target;
  }

  if (typeof target === 'string') {
    return sanitizeText(target) as unknown as T;
  }

  if (Array.isArray(target)) {
    return target.map(item => sanitizeObjectStrings(item)) as unknown as T;
  }

  if (typeof target === 'object') {
    const result: Record<string, any> = {};
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
