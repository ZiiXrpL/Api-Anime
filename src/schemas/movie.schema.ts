/**
 * Schema/validasi input untuk Movie module.
 * Project ini belum memakai library validasi (zod/joi dsb), jadi schema di
 * sini berbentuk fungsi validator ringan bertipe kuat — cukup untuk
 * memvalidasi query/param tanpa menambah dependency baru.
 */

export function parsePageQuery(value: unknown): number {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateSearchQuery(value: unknown): ValidationResult & { query: string } {
  const query = String(value ?? '').trim();
  if (!query) {
    return { valid: false, query, error: 'Query parameter "q" wajib diisi' };
  }
  return { valid: true, query };
}

export function validateSlugParam(value: unknown, paramName = 'slug'): ValidationResult & { slug: string } {
  const slug = String(value ?? '').trim();
  if (!slug) {
    return { valid: false, slug, error: `Parameter ${paramName} wajib diisi` };
  }
  return { valid: true, slug };
}
