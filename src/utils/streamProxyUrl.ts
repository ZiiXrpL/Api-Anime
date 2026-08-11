import { Request } from 'express';
import { StreamServer } from '../interfaces/anime.interface';

// Dipakai controller episode/stream supaya frontend punya pilihan: tanam
// `embedUrl` (lewat /stream-proxy, lolos dari X-Frame-Options/CSP upstream)
// di dalam web, dengan `url` asli tetap tersedia sebagai fallback "buka di
// tab baru" kalau proxy-nya sendiri gagal untuk provider tertentu.
export function withEmbedUrl(req: Request, servers: StreamServer[]): StreamServer[] {
  const base = `${req.protocol}://${req.get('host')}`;
  return servers.map((s) => ({
    ...s,
    embedUrl: `${base}/stream-proxy?url=${encodeURIComponent(s.url)}`,
  }));
}
