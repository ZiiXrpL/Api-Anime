import { otakudesuClient } from '../../helpers/axiosClient';
import { parseMovie } from '../../parsers/otakudesu.parser';
import { AnimeCard } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getMovies(page = 1): Promise<AnimeCard[]> {
  try {
    const path = page > 1 ? `/movies/page/${page}` : '/movies';
    const { data } = await otakudesuClient.get<string>(path);
    return parseMovie(data);
  } catch (error) {
    throw new SourceError('Otakudesu', `Gagal mengambil movies: ${(error as Error).message}`);
  }
}
