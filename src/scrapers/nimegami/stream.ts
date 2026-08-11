import { StreamServer } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';
import { fetchDetailHtml, parseEpisodeSlug } from './_shared';
import { parseDetail } from '../../parsers/nimegami.parser';

export async function getStreamServers(slug: string): Promise<StreamServer[]> {
  const parsed = parseEpisodeSlug(slug);
  if (!parsed) {
    throw new SourceError('Nimegami', `Slug episode "${slug}" bukan format Nimegami`);
  }
  try {
    const html = await fetchDetailHtml(parsed.animeSlug);
    const { episodes } = parseDetail(html, parsed.animeSlug);
    const ep = episodes.find((e) => e.number === parsed.episodeNumber);
    if (!ep) throw new Error(`Episode ${parsed.episodeNumber} tidak ditemukan`);
    return ep.streams;
  } catch (error) {
    throw new SourceError('Nimegami', `Gagal mengambil stream servers "${slug}": ${(error as Error).message}`);
  }
}
