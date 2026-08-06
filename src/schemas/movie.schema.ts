/**
 * Schema/validasi input untuk Movie module.
 * Project ini belum memakai library validasi (zod/joi dsb), jadi schema di
 * sini berbentuk fungsi validator ringan bertipe kuat — cukup untuk
 * memvalidasi query/param tanpa menambah dependency baru.
 */

export interface PageQuerySchema {
  page: number;
}

export function parsePageQuery(value: unknown): number {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export interface MovieListQuerySchema {
  page: number;
  genre?: string;
  country?: string;
  year?: string;
}

export function parseMovieListQuery(query: Record<string, unknown>): MovieListQuerySchema {
  return {
    page: parsePageQuery(query.page),
    genre: typeof query.genre === 'string' && query.genre.trim() ? query.genre.trim() : undefined,
    country: typeof query.country === 'string' && query.country.trim() ? query.country.trim() : undefined,
    year: typeof query.year === 'string' && query.year.trim() ? query.year.trim() : undefined,
  };
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
