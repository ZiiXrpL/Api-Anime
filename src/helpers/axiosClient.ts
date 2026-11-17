import axios, { AxiosInstance } from 'axios';
import { env } from '../configs/env';

// UA transparan (mengidentifikasi API ini apa adanya). UA browser palsu
// justru memicu WAF Samehadaku: terverifikasi Mozilla/... -> HTTP 403,
// sedangkan "Api-Anime/1.0 (+katalog anime publik)" -> HTTP 200 di
// Otakudesu, Nimegami, Kuramanime, Samehadaku dan sumber film.
const USER_AGENT = 'Api-Anime/1.0 (+katalog anime publik)';

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
  return client;
}

export const otakudesuClient = createClient(env.OTAKUDESU_URL);
export const samehadakuClient = createClient(env.SAMEHADAKU_URL);
export const nimegamiClient = createClient(env.NIMEGAMI_URL);
export const kuramanimeClient = createClient(env.KURAMANIME_URL);
