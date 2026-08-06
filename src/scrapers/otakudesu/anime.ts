import { otakudesuClient } from '../../helpers/axiosClient';
import { parseAnimeList } from '../../parsers/otakudesu.parser';
import { AnimeCard } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

/**
 * Daftar semua anime (A-Z list) Otakudesu.
 */
export async function getAllAnime(page = 1): Promise<AnimeCard[]> {
  try {
    const path = page > 1 ? `/anime-list/page/${page}` : '/anime-list';
    const { data } = await otakudesuClient.get<string>(path);
    return parseAnimeList(data);
  } catch (error) {
    throw new SourceError('Otakudesu', `Gagal mengambil daftar anime: ${(error as Error).message}`);
  }
}
