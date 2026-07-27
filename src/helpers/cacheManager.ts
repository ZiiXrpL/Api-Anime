import { cacheStore } from '../configs/cache';
import { logger } from '../utils/logger';

export const cacheManager = {
  get<T>(key: string): T | undefined {
    return cacheStore.get<T>(key);
  },

  set<T>(key: string, value: T, ttlSeconds: number): boolean {
    return cacheStore.set(key, value, ttlSeconds);
  },

  del(key: string): number {
    return cacheStore.del(key);
  },

  /**
   * Ambil dari cache jika ada, jika tidak jalankan fetcher lalu simpan hasilnya.
   */
  async wrap<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = cacheStore.get<T>(key);
    if (cached !== undefined) {
      logger.debug(`Cache HIT: ${key}`);
      return cached;
    }
    logger.debug(`Cache MISS: ${key}`);
    const fresh = await fetcher();
    cacheStore.set(key, fresh, ttlSeconds);
    return fresh;
  },
};
