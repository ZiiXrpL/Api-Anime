import NodeCache from 'node-cache';
import { env } from './env';

// stdTTL default diisi per-key saat .set(), jadi di sini cukup 0 (unlimited default)
export const cacheStore = new NodeCache({
  stdTTL: 0,
  checkperiod: 120,
  useClones: false,
});

export const CACHE_TTL = {
  HOME: env.CACHE_TTL_HOME,
  LIST: env.CACHE_TTL_LIST,
  DETAIL: env.CACHE_TTL_DETAIL,
  EPISODE: env.CACHE_TTL_EPISODE,
};
