import { DownloadGroup } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';
import { fetchDetailHtml, parseEpisodeSlug } from './_shared';
import { parseDownloadForEpisode } from '../../parsers/nimegami.parser';

export async function getDownloadLinks(slug: string): Promise<DownloadGroup[]> {
  const parsed = parseEpisodeSlug(slug);
  if (!parsed) {
    throw new SourceError('Nimegami', `Slug episode "${slug}" bukan format Nimegami`);
  }
  try {
    const html = await fetchDetailHtml(parsed.animeSlug);
    return parseDownloadForEpisode(html, parsed.episodeNumber);
  } catch (error) {
    throw new SourceError('Nimegami', `Gagal mengambil link download "${slug}": ${(error as Error).message}`);
  }
}
