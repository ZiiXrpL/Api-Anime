import { getActiveMovieSources, MovieSourceConfig } from '../configs/movieSources.config';
import { AllSourcesFailedError, SourceError } from '../interfaces/errors.interface';
import { logger } from '../utils/logger';

export interface MovieSourceResult<T> {
  source: string;
  data: T;
}

function isEmpty(data: unknown): boolean {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const values = Object.values(record);
    if (values.length === 0) return true;
    if ('title' in record && !record.title) return true;
    return false;
  }
  return false;
}

/**
 * Jalankan `fn` terhadap setiap source di `sources` secara berurutan sampai
 * salah satu berhasil (mirip services/sourceManager.service.ts milik Anime,
 * tapi digeneralisasi untuk N source alih-alih hardcode 2 source). Untuk
 * menambah source baru di masa depan, cukup tambahkan entry baru di
 * configs/movieSources.config.ts — fungsi ini otomatis mencobanya sebagai
 * fallback berikutnya tanpa perubahan kode apapun di sini.
 */
export async function withMovieFallback<T>(
  fn: (source: MovieSourceConfig) => Promise<T>,
  sources: MovieSourceConfig[] = getActiveMovieSources(),
): Promise<MovieSourceResult<T>> {
  let lastSourceName = 'None';

  for (const source of sources) {
    try {
      const data = await fn(source);
      if (isEmpty(data)) {
        throw new SourceError(source.name, `Data kosong dari ${source.name}`);
      }
      return { source: source.name, data };
    } catch (error) {
      lastSourceName = source.name;
      logger.warn(`${source.name} gagal: ${(error as Error).message}`);
    }
  }

  const names = sources.map((s) => s.name).join(', ');
  const err = new AllSourcesFailedError(`Semua source movie (${names}) tidak tersedia`);
  (err as unknown as { lastSource: string }).lastSource = lastSourceName;
  throw err;
}
