import axios, { AxiosInstance } from 'axios';
import { env } from '../configs/env';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0.0.0 Safari/537.36';

const clientCache = new Map<string, AxiosInstance>();

/**
 * Buat (atau ambil dari cache in-memory) axios client untuk sebuah baseURL
 * source Movie. Modular by design: setiap MovieSourceConfig.baseURL akan
 * mendapat client sendiri tanpa perlu mendaftarkannya di tempat lain.
 */
export function getMovieHttpClient(baseURL: string): AxiosInstance {
  const cached = clientCache.get(baseURL);
  if (cached) return cached;

  const client = axios.create({
    baseURL,
    timeout: env.REQUEST_TIMEOUT_MS,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      Referer: baseURL,
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });

  clientCache.set(baseURL, client);
  return client;
}
