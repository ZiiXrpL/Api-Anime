import { samehadakuClient } from '../../helpers/axiosClient';
import { parseGenreList, parseGenreAnimeList } from '../../parsers/samehadaku.parser';
import { AnimeCard, GenreItem } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getGenreList(): Promise<GenreItem[]> {
  try {
    const { data } = await samehadakuClient.get<string>('/daftar-genre-anime');
    return parseGenreList(data);
  } catch (error) {
    throw new SourceError('Samehadaku', `Gagal mengambil genre list: ${(error as Error).message}`);
  }
}

export async function getAnimeByGenre(genreSlug: string, page = 1): Promise<AnimeCard[]> {
  try {
    const path = page > 1 ? `/genre/${genreSlug}/page/${page}` : `/genre/${genreSlug}`;
    const { data } = await samehadakuClient.get<string>(path);
    return parseGenreAnimeList(data);
  } catch (error) {
    throw new SourceError('Samehadaku', `Gagal mengambil anime genre ${genreSlug}: ${(error as Error).message}`);
  }
}
