import { Request, Response } from 'express';
import axios from 'axios';
import { sendError } from '../utils/responseBuilder';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0.0.0 Safari/537.36';

// Server streaming pihak ketiga (embed host di balik server Otakudesu/
// Samehadaku/Nimegami) sering memasang header X-Frame-Options / Content-
// Security-Policy: frame-ancestors yang cuma mengizinkan dirinya ditanam
// lewat <iframe> di domain KELUARGA situs asal itu sendiri. Browser akan
// SELALU menolak menampilkannya lewat <iframe> di domain frontend kita --
// itu penyebab "loading terus menerus" padahal buka di tab baru (navigasi
// langsung, bukan iframe) berhasil. Endpoint ini mengambil kontennya lewat
// backend sendiri lalu mengirim ulang ke browser TANPA header proteksi
// upstream itu, supaya bisa ditanam di web sendiri.
const STRIPPED_UPSTREAM_HEADERS = new Set([
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
  'set-cookie',
  'content-encoding', // axios sudah decode otomatis, jangan ikut disalin
  'transfer-encoding',
  'connection',
]);

// Proteksi SSRF dasar: tolak target ke localhost/IP privat supaya proxy
// ini tidak bisa disalahgunakan untuk mengakses jaringan internal server.
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '0.0.0.0' || h === '::1' || h === '::') return true;
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}

export async function streamProxyController(req: Request, res: Response): Promise<void> {
  const target = req.query.url;
  if (typeof target !== 'string' || !target.trim()) {
    sendError(res, { message: 'Query parameter "url" wajib diisi', statusCode: 400 });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    sendError(res, { message: 'Parameter "url" bukan URL yang valid', statusCode: 400 });
    return;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    sendError(res, { message: 'Hanya URL http/https yang diizinkan', statusCode: 400 });
    return;
  }
  if (isBlockedHost(parsed.hostname)) {
    sendError(res, { message: 'URL target tidak diizinkan', statusCode: 400 });
    return;
  }

  try {
    const upstream = await axios.get<NodeJS.ReadableStream>(target, {
      responseType: 'stream',
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'User-Agent': USER_AGENT,
        Referer: parsed.origin + '/',
        Accept: '*/*',
        ...(req.headers.range ? { Range: req.headers.range as string } : {}),
      },
    });

    // Lepas header proteksi bawaan Helmet khusus untuk response endpoint
    // ini -- tujuannya justru supaya konten BISA ditanam lewat <iframe> di
    // domain frontend, kebalikan dari fungsi normal Helmet di route lain.
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Cross-Origin-Opener-Policy');
    res.removeHeader('Cross-Origin-Embedder-Policy');
    res.removeHeader('Cross-Origin-Resource-Policy');

    res.status(upstream.status);
    for (const [key, value] of Object.entries(upstream.headers)) {
      if (STRIPPED_UPSTREAM_HEADERS.has(key.toLowerCase())) continue;
      if (value === undefined || value === null) continue;
      res.setHeader(key, Array.isArray(value) ? value.map(String) : String(value));
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (!res.getHeader('Cache-Control')) {
      res.setHeader('Cache-Control', 'public, max-age=60');
    }

    upstream.data.pipe(res);
    upstream.data.on('error', () => {
      if (!res.headersSent) {
        sendError(res, { message: 'Gagal streaming dari server sumber', statusCode: 502 });
      } else {
        res.end();
      }
    });
  } catch (error) {
    if (!res.headersSent) {
      sendError(res, {
        message: `Gagal mengambil stream dari server sumber: ${(error as Error).message}`,
        statusCode: 502,
      });
    }
  }
}
