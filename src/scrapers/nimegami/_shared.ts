import NodeCache from 'node-cache';
import { nimegamiClient } from '../../helpers/axiosClient';

// Halaman detail Nimegami dipanggil ulang oleh detail/episode/stream/download
// (masing-masing punya cache key sendiri di anime.service). Cache mentah 5
// menit ini biar tidak fetch HTML yang sama berkali-kali dalam waktu dekat.
const pageCache = new NodeCache({ stdTTL: 300 });

export async function fetchDetailHtml(animeSlug: string): Promise<string> {
  const cached = pageCache.get<string>(animeSlug);
  if (cached) return cached;
  const { data } = await nimegamiClient.get<string>(`/${animeSlug}/`);
  pageCache.set(animeSlug, data);
  return data;
}

const PREFIX = 'nimegami-';

export function buildEpisodeSlug(animeSlug: string, episodeNumber: number): string {
  return `${PREFIX}${animeSlug}--ep-${episodeNumber}`;
}

export function parseEpisodeSlug(slug: string): { animeSlug: string; episodeNumber: number } | null {
  if (!slug.startsWith(PREFIX)) return null;
  const rest = slug.slice(PREFIX.length);
  const match = rest.match(/^(.+)--ep-(\d+)$/);
  if (!match) return null;
  return { animeSlug: match[1] as string, episodeNumber: Number(match[2]) };
}
