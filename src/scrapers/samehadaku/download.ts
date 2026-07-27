import * as cheerio from 'cheerio';
import { samehadakuClient } from '../../helpers/axiosClient';
import { DownloadGroup } from '../../interfaces/anime.interface';
import { getEpisodeDetail } from './episode';
import { SourceError } from '../../interfaces/errors.interface';

export async function getDownloadLinks(episodeSlug: string): Promise<DownloadGroup[]> {
  const episode = await getEpisodeDetail(episodeSlug);
  return episode.downloadList;
}

/**
 * Untuk endpoint /batch/:id - Samehadaku memakai prefix "batch/" pada slug-nya sendiri.
 */
export async function getBatchDownload(batchSlug: string): Promise<DownloadGroup[]> {
  try {
    const { data } = await samehadakuClient.get<string>(`/batch/${batchSlug}`);
    const $ = cheerio.load(data);
    const downloadList: DownloadGroup[] = [];
    $('.download-eps ul li, .downloadx ul li').each((_, el) => {
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
    throw new SourceError('Samehadaku', `Gagal mengambil batch "${batchSlug}": ${(error as Error).message}`);
  }
}
