import * as cheerio from 'cheerio';
import { AxiosInstance } from 'axios';

// Action id ini diambil dari script inline di halaman episode Otakudesu
// ($('.mirrorstream a[href^="#"]').on('click', ...)). Kalau situs update tema,
// action id ini kemungkinan berubah dan perlu di-scrape ulang dari <script>
// inline halaman episode, bukan di-hardcode selamanya.
const ACTION_GET_NONCE = 'aa1208d27f29ca340c92c66d1926f13f';
const ACTION_GET_EMBED = '2a3505c93b0035d3f455df82bf976b84';

export interface MirrorContent {
  id: number;
  i: number;
  q: string;
}

interface AjaxResponse {
  data?: string;
}

/**
 * Resolve 1 kandidat mirror (dari parseMirrorCandidates) jadi URL embed video asli.
 * Butuh 2 request POST ke wp-admin/admin-ajax.php:
 *  1. Minta nonce (action=aa1208...)
 *  2. Kirim {id, i, q, nonce} (action=2a3505...) -> balikin HTML ter-base64 berisi <iframe>
 *
 * `client` harus axios instance yang sudah di-baseURL-kan ke domain Otakudesu
 * (mis. otakudesuClient dari helpers/axiosClient.ts), supaya header/cookie konsisten.
 */
export async function resolveOtakudesuStreamUrl(
  client: AxiosInstance,
  content: MirrorContent,
): Promise<string> {
  const nonceRes = await client.post<AjaxResponse>(
    '/wp-admin/admin-ajax.php',
    new URLSearchParams({ action: ACTION_GET_NONCE }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  const nonce = nonceRes.data?.data;
  if (!nonce) {
    throw new Error('Gagal mendapatkan nonce dari Otakudesu (format response berubah?)');
  }

  const embedRes = await client.post<AjaxResponse>(
    '/wp-admin/admin-ajax.php',
    new URLSearchParams({
      id: String(content.id),
      i: String(content.i),
      q: content.q,
      nonce,
      action: ACTION_GET_EMBED,
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  const encoded = embedRes.data?.data;
  if (!encoded) {
    throw new Error('Gagal mendapatkan embed dari Otakudesu (format response berubah?)');
  }

  const html = Buffer.from(encoded, 'base64').toString('utf-8');
  const $ = cheerio.load(html);
  const src = $('iframe').first().attr('src') || '';
  if (!src) {
    throw new Error('Embed tidak mengandung <iframe src>');
  }
  return src;
}
