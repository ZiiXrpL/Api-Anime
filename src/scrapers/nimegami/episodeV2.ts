import axios from 'axios';
import { SourceError } from '../../interfaces/errors.interface';
import { DownloadGroup, EpisodeDetail } from '../../interfaces/anime.interface';

async function getHtml(path: string): Promise<string> {
  // Client minimal sengaja dipakai di resolver ini: kombinasi header shared
  // client (Referer/Accept) memicu 404 pada rute download Nimegami.
  const { data } = await axios.get<string>(`https://nimegami.id${path}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Connection: 'close',
    },
    timeout: 20000,
    maxRedirects: 10,
  });
  return data;
}

async function resolveDownloadUrl(path: string): Promise<string> {
  const response = await axios.get<string>(`https://nimegami.id${path}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', Connection: 'close' },
    timeout: 20000,
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400,
  });
  const location = String(response.headers.location || '');
  const matched = location.match(/\/hal\/download\/([a-f0-9-]+)\?name=([^&]+)/i);
  if (!matched) return '';
  return `https://vsys-srv.berkasdrive.com/public/download/${matched[1]}?name=${decodeURIComponent(matched[2])}`;
}

function qualityRank(quality: string): number {
  return { '360p': 1, '480p': 2, '720p': 3, '1080p': 4 }[quality.toLowerCase()] ?? 0;
}

/** Token dari halaman detail disimpan supaya episode cukup satu request. */
const tokenCache = new Map<string, Map<string, string>>();

export function rememberDownloadTokens(slug: string, html: string): void {
  const map = new Map<string, string>();
  for (const match of html.matchAll(/\/download\/(\d+)\/([a-z0-9]+)\/([a-z0-9]+)\//gi)) {
    const key = `${match[1]}:${match[2].toLowerCase()}`;
    const current = map.get(key);
    if (!current || qualityRank(match[2]) > qualityRank(current.split('/')[3] ?? '')) {
      map.set(key, match[0]);
    }
  }
  tokenCache.set(slug, map);
}

/**
 * Episode Nimegami: halaman detail memuat tautan unduh resmi
 * /download/{ep}/{quality}/{token}/ secara server-rendered. Rute itu
 * mengarah ke halaman BerkasDrive yang memuat URL file MP4 langsung.
 *
 * URL diambil dari HTML asli yang dikirim sumber — tidak ada URL rekaan
 * dan tidak ada usaha melewati proteksi/DRM.
 */
export async function getEpisodeDetail(slug: string): Promise<EpisodeDetail> {
  const matched = slug.match(/^nimegami-(.+)--ep-(\d+)$/);
  if (!matched) {
    throw new SourceError('Nimegami', `Slug episode tidak dikenali: ${slug}`);
  }
  const animeSlug = matched[1];
  const episodeNumber = matched[2];

  const cached = tokenCache.get(animeSlug);
  const candidates = new Map<string, string>();
  if (cached) {
    for (const [key, path] of cached) {
      const [ep, quality] = key.split(':');
      if (ep === episodeNumber) candidates.set(quality, path);
    }
  }
  if (candidates.size === 0) {
    const detailHtml = await getHtml(`/${animeSlug}/`);
    rememberDownloadTokens(animeSlug, detailHtml);
    // Hindari penolakan 404 dari WAF bila request download menyusul terlalu cepat.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    for (const match of detailHtml.matchAll(
      new RegExp(`/download/${episodeNumber}/([a-z0-9]+)/([a-z0-9]+)/`, 'gi'),
    )) {
      const quality = match[1].toLowerCase();
      const current = candidates.get(quality);
      if (!current || qualityRank(quality) > qualityRank(current.split('/')[3] ?? '')) {
        candidates.set(quality, match[0]);
      }
    }
  }
  const ordered = [...candidates.entries()].sort((a, b) => {
    const preferred: Record<string, number> = { '720p': 4, '1080p': 3, '480p': 2, '360p': 1 };
    return (preferred[b[0]] ?? 0) - (preferred[a[0]] ?? 0);
  });
  if (ordered.length === 0) {
    throw new SourceError('Nimegami', `Tidak ada tautan media untuk episode ${episodeNumber}`);
  }

  let directUrl = '';
  let usedQuality = '';
  for (const [quality, path] of ordered.slice(0, 2)) {
    try {
      const resolved = await resolveDownloadUrl(path);
      if (resolved) {
        directUrl = resolved;
        usedQuality = quality;
        break;
      }
    } catch {
      // Coba kualitas berikutnya; satu token bisa gagal.
    }
  }

  if (!directUrl) {
    throw new SourceError('Nimegami', `Semua tautan media gagal di-resolve untuk episode ${episodeNumber}`);
  }

  const serverName = `Berkasdrive ${usedQuality}`.trim();
  const downloadList: DownloadGroup[] = [
    {
      quality: usedQuality || 'MP4',
      format: 'MP4',
      links: [{ provider: 'Berkasdrive', url: directUrl }],
    },
  ];

  return {
    title: `Episode ${episodeNumber}`,
    slug,
    animeSlug,
    streamServers: [{ name: serverName, url: directUrl }],
    downloadList,
    navigation: { allEpisodeSlug: animeSlug },
  };
}
