import { nimegamiClient } from '../../helpers/axiosClient';
import { parseGenreList, parseArchiveList } from '../../parsers/nimegami.parser';
import { AnimeCard, GenreItem } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getGenreList(): Promise<GenreItem[]> {
  try {
    const { data } = await nimegamiClient.get<string>('/genre-category-list/');
    return parseGenreList(data);
  } catch (error) {
    throw new SourceError('Nimegami', `Gagal mengambil genre list: ${(error as Error).message}`);
  }
}

export async function getAnimeByGenre(genreSlug: string, page = 1): Promise<AnimeCard[]> {
  try {
    const path = page > 1 ? `/category/${genreSlug}/page/${page}/` : `/category/${genreSlug}/`;
    const { data } = await nimegamiClient.get<string>(path);
    return parseArchiveList(data);
  } catch (error) {
    throw new SourceError('Nimegami', `Gagal mengambil anime genre ${genreSlug}: ${(error as Error).message}`);
  }
}
