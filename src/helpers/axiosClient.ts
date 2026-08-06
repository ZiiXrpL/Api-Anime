import axios, { AxiosInstance } from 'axios';
import { env } from '../configs/env';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0.0.0 Safari/537.36';

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
