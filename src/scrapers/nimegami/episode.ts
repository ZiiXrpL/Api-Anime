import { EpisodeDetail } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';
import { fetchDetailHtml, parseEpisodeSlug, buildEpisodeSlug } from './_shared';
import { parseDetail, parseDownloadForEpisode } from '../../parsers/nimegami.parser';
import { resolveStreamServers } from './_resolveStream';

export async function getEpisodeDetail(slug: string): Promise<EpisodeDetail> {
  const parsed = parseEpisodeSlug(slug);
  if (!parsed) {
    throw new SourceError('Nimegami', `Slug episode "${slug}" bukan format Nimegami`);
  }
  const { animeSlug, episodeNumber } = parsed;
  try {
    const html = await fetchDetailHtml(animeSlug);
    const { episodes } = parseDetail(html, animeSlug);
    const ep = episodes.find((e) => e.number === episodeNumber);
    if (!ep) throw new Error(`Episode ${episodeNumber} tidak ditemukan`);
    const downloadList = parseDownloadForEpisode(html, episodeNumber);
    const streamServers = await resolveStreamServers(ep.streams);

    const prevSlug = episodes.some((e) => e.number === episodeNumber - 1)
      ? buildEpisodeSlug(animeSlug, episodeNumber - 1)
      : undefined;
    const nextSlug = episodes.some((e) => e.number === episodeNumber + 1)
      ? buildEpisodeSlug(animeSlug, episodeNumber + 1)
      : undefined;

    return {
      title: ep.title,
      slug,
      animeSlug,
      streamServers,
      downloadList,
      navigation: { prevSlug, nextSlug, allEpisodeSlug: animeSlug },
    };
  } catch (error) {
    throw new SourceError('Nimegami', `Gagal mengambil episode "${slug}": ${(error as Error).message}`);
  }
}
