import { otakudesuClient } from '../../helpers/axiosClient';
import { parseOngoing } from '../../parsers/otakudesu.parser';
import { AnimeCard } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getOngoing(page = 1): Promise<AnimeCard[]> {
  try {
    const path = page > 1 ? `/ongoing-anime/page/${page}` : '/ongoing-anime';
    const { data } = await otakudesuClient.get<string>(path);
    return parseOngoing(data);
  } catch (error) {
    throw new SourceError('Otakudesu', `Gagal mengambil ongoing: ${(error as Error).message}`);
  }
}
