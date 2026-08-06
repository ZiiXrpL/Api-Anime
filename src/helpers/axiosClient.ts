import axios, { AxiosInstance } from 'axios';
import { env } from '../configs/env';
import { logger } from '../utils/logger';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0.0.0 Safari/537.36';

// FIX (diagnostik "data kosong terus di server, padahal HTML sample dari
// browser asli isinya lengkap"): kemungkinan besar Kuramanime membedakan
// perlakuan berdasarkan IP -- banyak situs (lewat Cloudflare atau WAF
// custom) mem-blok/kasih halaman kosong untuk IP milik penyedia
// cloud/hosting (Railway, AWS, dst), sementara IP normal (HP/laptop biasa)
// tetap dapat konten asli. Interceptor ini TIDAK memperbaiki masalah itu
// (kalau memang itu penyebabnya, perlu solusi lain, mis. proxy residential)
// -- tapi mencatat tanda-tandanya di log supaya kita tahu PASTI apakah ini
// benar diblokir, atau justru selector parsing-nya yang salah.
function looksLikeBlockedOrChallenge(html: string): string | null {
  const sample = html.slice(0, 2000).toLowerCase();
  if (sample.includes('just a moment') || sample.includes('checking your browser')) {
    return 'Terdeteksi halaman tantangan Cloudflare ("Just a moment" / "Checking your browser")';
  }
  if (sample.includes('attention required') || sample.includes('cf-error')) {
    return 'Terdeteksi halaman error/block Cloudflare';
  }
  if (sample.includes('access denied') || sample.includes('403 forbidden')) {
    return 'Terdeteksi halaman "Access Denied" / 403';
  }
  if (html.length < 2000) {
    return `HTML yang diterima mencurigakan pendek (${html.length} karakter) -- halaman asli Kuramanime biasanya puluhan ribu karakter`;
  }
  return null;
}

function createClient(baseURL: string): AxiosInstance {
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

  client.interceptors.response.use((response) => {
    if (typeof response.data === 'string') {
      const warning = looksLikeBlockedOrChallenge(response.data);
      if (warning) {
        logger.warn(
          `[DIAGNOSTIK ${baseURL}] Kemungkinan diblokir saat GET ${response.config.url}: ${warning}. ` +
            `Status: ${response.status}, server header: ${response.headers?.server ?? '(tidak ada)'}, ` +
            `cf-ray: ${response.headers?.['cf-ray'] ?? '(tidak ada)'}`,
        );
      }
    }
    return response;
  });

  return client;
}

export const kuramanimeClient = createClient(env.KURAMANIME_URL);
