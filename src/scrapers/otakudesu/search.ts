import { otakudesuClient } from '../../helpers/axiosClient';
import { parseSearch } from '../../parsers/otakudesu.parser';
import { AnimeCard } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function searchAnime(query: string): Promise<AnimeCard[]> {
  try {
    const { data } = await otakudesuClient.get<string>('/', {
      params: { s: query, post_type: 'anime' },
    });
    return parseSearch(data);
  } catch (error) {
    throw new SourceError('Otakudesu', `Gagal mencari "${query}": ${(error as Error).message}`);
  }
}
