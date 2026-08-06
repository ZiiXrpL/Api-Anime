import { otakudesuClient } from '../../helpers/axiosClient';
import { parseCompleted } from '../../parsers/otakudesu.parser';
import { AnimeCard } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getCompleted(page = 1): Promise<AnimeCard[]> {
  try {
    const path = page > 1 ? `/complete-anime/page/${page}` : '/complete-anime';
    const { data } = await otakudesuClient.get<string>(path);
    return parseCompleted(data);
  } catch (error) {
    throw new SourceError('Otakudesu', `Gagal mengambil completed: ${(error as Error).message}`);
  }
}
