import { samehadakuClient } from '../../helpers/axiosClient';
import { parseSearch } from '../../parsers/samehadaku.parser';
import { AnimeCard } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function searchAnime(query: string): Promise<AnimeCard[]> {
  try {
    const { data } = await samehadakuClient.get<string>('/', {
      params: { s: query },
    });
    return parseSearch(data);
  } catch (error) {
    throw new SourceError('Samehadaku', `Gagal mencari "${query}": ${(error as Error).message}`);
  }
}
