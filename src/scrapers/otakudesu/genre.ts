import { otakudesuClient } from '../../helpers/axiosClient';
import { parseGenreList, parseGenreAnimeList } from '../../parsers/otakudesu.parser';
import { AnimeCard, GenreItem } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getGenreList(): Promise<GenreItem[]> {
  try {
    const { data } = await otakudesuClient.get<string>('/genre-list');
    return parseGenreList(data);
  } catch (error) {
    throw new SourceError('Otakudesu', `Gagal mengambil genre list: ${(error as Error).message}`);
  }
}

export async function getAnimeByGenre(genreSlug: string, page = 1): Promise<AnimeCard[]> {
  try {
    const path = page > 1 ? `/genres/${genreSlug}/page/${page}` : `/genres/${genreSlug}`;
    const { data } = await otakudesuClient.get<string>(path);
    return parseGenreAnimeList(data);
  } catch (error) {
    throw new SourceError('Otakudesu', `Gagal mengambil anime genre ${genreSlug}: ${(error as Error).message}`);
  }
}
