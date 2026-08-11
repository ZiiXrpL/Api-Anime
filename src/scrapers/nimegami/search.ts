import { nimegamiClient } from '../../helpers/axiosClient';
import { parseArchiveList } from '../../parsers/nimegami.parser';
import { AnimeCard } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function searchAnime(query: string): Promise<AnimeCard[]> {
  try {
    const { data } = await nimegamiClient.get<string>('/', {
      params: { s: query, post_type: 'post' },
    });
    return parseArchiveList(data);
  } catch (error) {
    throw new SourceError('Nimegami', `Gagal mencari "${query}": ${(error as Error).message}`);
  }
}
