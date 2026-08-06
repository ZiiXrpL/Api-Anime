import * as cheerio from 'cheerio';
import { otakudesuClient } from '../../helpers/axiosClient';
import { DownloadGroup } from '../../interfaces/anime.interface';
import { getEpisodeDetail } from './episode';
import { SourceError } from '../../interfaces/errors.interface';

export async function getDownloadLinks(episodeSlug: string): Promise<DownloadGroup[]> {
  const episode = await getEpisodeDetail(episodeSlug);
  return episode.downloadList;
}

/**
 * Untuk endpoint /batch/:id - Otakudesu punya halaman batch download tersendiri
 * dengan struktur mirip halaman episode.
 */
export async function getBatchDownload(batchSlug: string): Promise<DownloadGroup[]> {
  try {
    const { data } = await otakudesuClient.get<string>(`/batch/${batchSlug}`);
    const $ = cheerio.load(data);
    const downloadList: DownloadGroup[] = [];
    $('.download ul li, .downloadxx ul li').each((_, el) => {
      const $el = $(el);
      const quality = $el.find('strong').first().text().trim() || 'Unknown';
      const links = $el
        .find('a')
        .map((__, a) => ({ provider: $(a).text().trim(), url: $(a).attr('href') || '' }))
        .get()
        .filter((l) => l.url);
      if (links.length) downloadList.push({ quality, links });
    });
    return downloadList;
  } catch (error) {
    throw new SourceError('Otakudesu', `Gagal mengambil batch "${batchSlug}": ${(error as Error).message}`);
  }
}
