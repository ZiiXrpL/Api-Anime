import { adapters } from '../adapters/registry';
import { SOURCE_KEYS, SourceKey } from '../adapters/types';
import { cacheManager } from '../helpers/cacheManager';
import { env } from '../configs/env';
import axios from 'axios';
import { logger } from '../utils/logger';

export interface SourceStatus {
  name: SourceKey;
  baseUrl: string;
  available: boolean;
  responseTime: number | null;
  lastChecked: string;
  httpStatus: number | null;
  error?: string;
}

const CACHE_KEY = 'sources:status';
const CACHE_TTL = 60; // detik — monitoring tidak boleh membanjiri sumber

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0.0.0 Safari/537.36';

async function checkSource(key: SourceKey): Promise<SourceStatus> {
  const adapter = adapters[key];
  const started = Date.now();
  try {
    const response = await axios.get<string>(adapter.baseUrl, {
      timeout: Math.min(env.REQUEST_TIMEOUT_MS, 10000),
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      maxRedirects: 5,
      validateStatus: () => true,
    });
    const body = typeof response.data === 'string' ? response.data : '';
    const available = response.status >= 200 && response.status < 400 && body.trim().length > 500;
    return {
      name: key,
      baseUrl: adapter.baseUrl,
      available,
      responseTime: Date.now() - started,
      lastChecked: new Date().toISOString(),
      httpStatus: response.status,
      ...(available ? {} : { error: body.trim().length <= 500 ? 'Respons HTML kosong' : `HTTP ${response.status}` }),
    };
  } catch (error) {
    const err = error as { response?: { status?: number }; code?: string; message?: string };
    return {
      name: key,
      baseUrl: adapter.baseUrl,
      available: false,
      responseTime: null,
      lastChecked: new Date().toISOString(),
      httpStatus: err.response?.status ?? null,
      error: err.code || err.message || 'UNKNOWN',
    };
  }
}

export async function getSourcesStatus(force = false): Promise<SourceStatus[]> {
  if (!force) {
    const cached = cacheManager.get<SourceStatus[]>(CACHE_KEY);
    if (cached) return cached;
  }
  const results = await Promise.all(SOURCE_KEYS.map(checkSource));
  cacheManager.set(CACHE_KEY, results, CACHE_TTL);
  if (results.some((r) => !r.available)) {
    logger.warn('Beberapa sumber tidak tersedia: ' + results.filter((r) => !r.available).map((r) => `${r.name}(${r.error})`).join(', '));
  }
  return results;
}
