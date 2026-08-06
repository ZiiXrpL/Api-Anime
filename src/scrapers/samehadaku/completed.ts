import { samehadakuClient } from '../../helpers/axiosClient';
import { parseCompleted } from '../../parsers/samehadaku.parser';
import { AnimeCard } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getCompleted(page = 1): Promise<AnimeCard[]> {
  try {
    const path = page > 1 ? `/anime-completed/page/${page}` : '/anime-completed';
    const { data } = await samehadakuClient.get<string>(path);
    return parseCompleted(data);
  } catch (error) {
    throw new SourceError('Samehadaku', `Gagal mengambil completed: ${(error as Error).message}`);
  }
}
