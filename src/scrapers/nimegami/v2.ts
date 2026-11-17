import { nimegamiClient } from '../../helpers/axiosClient';
import { SourceError } from '../../interfaces/errors.interface';
import { AnimeCard, AnimeDetail, GenreItem, HomeData } from '../../interfaces/anime.interface';
import { parseDetail, parseGenres, parseHome, parseHomeCards } from '../../parsers/nimegamiV2.parser';

async function get(path: string, label: string): Promise<string> {
  try {
    const { data } = await nimegamiClient.get<string>(path);
    return data;
  } catch (error) {
    throw new SourceError('Nimegami', `Gagal ${label}: ${(error as Error).message}`);
  }
}

export async function getHome(): Promise<HomeData> {
  return parseHome(await get('/', 'home'));
}

export async function getAnimeDetail(slug: string): Promise<AnimeDetail> {
  return parseDetail(await get(`/${encodeURIComponent(slug)}/`, `detail "${slug}"`), slug);
}

export async function getGenres(): Promise<GenreItem[]> {
  return parseGenres(await get('/', 'genre'));
}

/**
 * Nimegami /anime/ adalah katalog server-rendered dengan filter via query:
 *   ?status=FINISHED  -> completed
 *   ?q=<kata>         -> pencarian
 *   ?page=<n>         -> pagination
 * Ongoing diambil dari kartu home (update episode terbaru) yang juga
 * server-rendered. Halaman /ongoing-anime/ dan /search/ hanya skeleton JS,
 * jadi tidak dipakai.
 */
export async function getOngoing(page = 1): Promise<AnimeCard[]> {
  if (page > 1) return [];
  return parseHomeCards(await get('/', 'ongoing'));
}

export async function getCompleted(page = 1): Promise<AnimeCard[]> {
  const path = page > 1 ? `/anime/?status=FINISHED&page=${page}` : '/anime/?status=FINISHED';
  return parseHomeCards(await get(path, `completed page ${page}`));
}

export async function getAnimeList(page = 1): Promise<AnimeCard[]> {
  const path = page > 1 ? `/anime/?page=${page}` : '/anime/';
  return parseHomeCards(await get(path, `anime list page ${page}`));
}

export async function searchAnime(query: string): Promise<AnimeCard[]> {
  return parseHomeCards(await get(`/anime/?q=${encodeURIComponent(query)}`, `pencarian "${query}"`));
}
