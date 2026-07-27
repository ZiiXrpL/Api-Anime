import { samehadakuClient } from '../../helpers/axiosClient';
import { parseOngoing } from '../../parsers/samehadaku.parser';
import { AnimeCard } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getOngoing(page = 1): Promise<AnimeCard[]> {
  try {
    const path = page > 1 ? `/anime-terbaru/page/${page}` : '/anime-terbaru';
    const { data } = await samehadakuClient.get<string>(path);
    return parseOngoing(data);
  } catch (error) {
    throw new SourceError('Samehadaku', `Gagal mengambil ongoing: ${(error as Error).message}`);
  }
}
