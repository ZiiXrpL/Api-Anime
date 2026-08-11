import { SourceName } from '../interfaces/response.interface';
import { SourceError, AllSourcesFailedError } from '../interfaces/errors.interface';
import { logger } from '../utils/logger';

export interface SourceResult<T> {
  source: SourceName;
  data: T;
}

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

// Versi generik withFallback untuk N source (dipakai untuk menyisipkan
// Nimegami sebagai fallback ke-3 di belakang Otakudesu & Samehadaku pada
// search/genre/detail/episode/stream/download).
export async function withFallbackChain<T>(
  attempts: { source: SourceName; fetcher: () => Promise<T> }[],
): Promise<SourceResult<T>> {
  let lastSource: SourceName = 'None';
  for (const attempt of attempts) {
    try {
      const data = await attempt.fetcher();
      if (!isEmpty(data)) {
        return { source: attempt.source, data };
      }
      logger.warn(`${attempt.source}: data kosong`);
    } catch (err) {
      logger.warn(`${attempt.source} gagal: ${(err as Error).message}`);
    }
    lastSource = attempt.source;
  }
  const names = attempts.map((a) => a.source).join(', ');
  const err = new AllSourcesFailedError(`Semua source (${names}) tidak tersedia`);
  (err as unknown as { lastSource: SourceName }).lastSource = lastSource;
  throw err;
}

function isEmpty(data: unknown): boolean {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') {
    const values = Object.values(data as Record<string, unknown>);
    if (values.length === 0) return true;
    const record = data as Record<string, unknown>;
    if ('title' in record && !record.title) return true;
    return false;
  }
  return false;
}
