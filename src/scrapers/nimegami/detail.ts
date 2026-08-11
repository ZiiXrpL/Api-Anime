import { parseDetail } from '../../parsers/nimegami.parser';
import { AnimeDetail } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';
import { fetchDetailHtml } from './_shared';

export async function getAnimeDetail(slug: string): Promise<AnimeDetail> {
  try {
    const html = await fetchDetailHtml(slug);
    const { detail } = parseDetail(html, slug);
    return detail;
  } catch (error) {
    throw new SourceError('Nimegami', `Gagal mengambil detail anime "${slug}": ${(error as Error).message}`);
  }
}
