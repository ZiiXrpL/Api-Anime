import { SourceName } from '../interfaces/response.interface';
import { SourceError, AllSourcesFailedError } from '../interfaces/errors.interface';
import { logger } from '../utils/logger';

export interface SourceResult<T> {
  source: SourceName;
  data: T;
}

/**
 * Menjalankan fetcher Otakudesu terlebih dahulu.
 * Jika gagal (network error / parsing kosong / dsb), fallback ke Samehadaku.
 * Jika keduanya gagal, lempar AllSourcesFailedError yang berisi source terakhir yang gagal.
 */
export async function withFallback<T>(
  otakudesuFetcher: () => Promise<T>,
  samehadakuFetcher: () => Promise<T>,
): Promise<SourceResult<T>> {
  try {
    const data = await otakudesuFetcher();
    if (isEmpty(data)) {
      throw new SourceError('Otakudesu', 'Data kosong dari Otakudesu');
    }
    return { source: 'Otakudesu', data };
  } catch (otakudesuError) {
    logger.warn(`Otakudesu gagal, fallback ke Samehadaku: ${(otakudesuError as Error).message}`);
    try {
      const data = await samehadakuFetcher();
      if (isEmpty(data)) {
        throw new SourceError('Samehadaku', 'Data kosong dari Samehadaku');
      }
      return { source: 'Samehadaku', data };
    } catch (samehadakuError) {
      logger.error(`Samehadaku juga gagal: ${(samehadakuError as Error).message}`);
      const err = new AllSourcesFailedError('Semua source (Otakudesu & Samehadaku) tidak tersedia');
      (err as unknown as { lastSource: SourceName }).lastSource = 'Samehadaku';
      throw err;
    }
  }
}

function isEmpty(data: unknown): boolean {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') {
    // Untuk object seperti HomeData { ongoing, completed } atau AnimeDetail { title, ... }
    const values = Object.values(data as Record<string, unknown>);
    if (values.length === 0) return true;
    // Jika object punya field "title" kosong (misal AnimeDetail) anggap kosong
    const record = data as Record<string, unknown>;
    if ('title' in record && !record.title) return true;
    return false;
  }
  return false;
}
