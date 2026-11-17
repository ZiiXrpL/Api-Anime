import axios, { AxiosInstance } from 'axios';
import { env } from '../configs/env';

// UA transparan, sama seperti helpers/axiosClient.ts (bukan browser palsu).
const USER_AGENT = 'Api-Anime/1.0 (+katalog anime publik)';

const clientCache = new Map<string, AxiosInstance>();
const finalUrlCache = new Map<string, { url: string; at: number }>();

/**
 * Domain sumber film melakukan rotasi (nationalgeoraphic.com -> chairmanmao.org).
 * Redirect 301/302 membuat axios mengganti POST menjadi GET sehingga body
 * form AJAX hilang dan resolusi server gagal (HTTP 400). Fungsi ini mengikuti
 * redirect sekali lalu meng-cache URL akhir selama 1 jam; URL inilah yang
 * dipakai untuk POST. Jika gagal, URL asli dikembalikan (perilaku lama).
 */
export async function resolveFinalUrl(url: string, ttlMs = 60 * 60 * 1000): Promise<string> {
  const cached = finalUrlCache.get(url);
  if (cached && Date.now() - cached.at < ttlMs) return cached.url;
  try {
    const res = await axios.get(url, {
      timeout: env.REQUEST_TIMEOUT_MS,
      maxRedirects: 10,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: { 'User-Agent': USER_AGENT },
    });
    const final = (res.request as { res?: { responseUrl?: string } })?.res?.responseUrl ?? url;
    finalUrlCache.set(url, { url: final, at: Date.now() });
    return final;
  } catch {
    return url;
  }
}

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
