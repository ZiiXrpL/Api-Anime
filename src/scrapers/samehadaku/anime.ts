import { samehadakuClient } from '../../helpers/axiosClient';
import { parseAnimeList } from '../../parsers/samehadaku.parser';
import { AnimeCard } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

/**
 * Daftar semua anime (daftar anime A-Z) Samehadaku.
 */
export async function getAllAnime(page = 1): Promise<AnimeCard[]> {
  try {
    const path = page > 1 ? `/daftar-anime-2/page/${page}` : '/daftar-anime-2';
    const { data } = await samehadakuClient.get<string>(path);
    return parseAnimeList(data);
  } catch (error) {
    throw new SourceError('Samehadaku', `Gagal mengambil daftar anime: ${(error as Error).message}`);
  }
}
