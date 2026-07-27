import { samehadakuClient } from '../../helpers/axiosClient';
import { parseMovie } from '../../parsers/samehadaku.parser';
import { AnimeCard } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getMovies(page = 1): Promise<AnimeCard[]> {
  try {
    const path = page > 1 ? `/anime-movie/page/${page}` : '/anime-movie';
    const { data } = await samehadakuClient.get<string>(path);
    return parseMovie(data);
  } catch (error) {
    throw new SourceError('Samehadaku', `Gagal mengambil movies: ${(error as Error).message}`);
  }
}
