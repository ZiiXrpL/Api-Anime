import { AnimeCard, HomeData } from '../../interfaces/anime.interface';
import { parseAnimeCards, parseHome as parseHomeHtml } from '../../parsers/kuramanime.parser';
import { fetchKuramanimeHtml } from './_shared';

export async function getHome(): Promise<HomeData> {
  return parseHomeHtml(await fetchKuramanimeHtml('/', 'home'));
}

export async function getOngoing(page = 1): Promise<AnimeCard[]> {
  // Kuramanime menolak parameter `order_by` (mengembalikan halaman tanpa kartu).
  // Gunakan path bersih; pagination memakai `?page=`.
  const path = page > 1 ? `/quick/ongoing?page=${page}` : '/quick/ongoing';
  return parseAnimeCards(await fetchKuramanimeHtml(path, `ongoing page ${page}`));
}

export async function getCompleted(page = 1): Promise<AnimeCard[]> {
  const path = page > 1 ? `/quick/finished?page=${page}` : '/quick/finished';
  return parseAnimeCards(await fetchKuramanimeHtml(path, `completed page ${page}`));
}

export async function getAllAnime(page = 1): Promise<AnimeCard[]> {
  const path = page > 1 ? `/anime?page=${page}` : '/anime';
  return parseAnimeCards(await fetchKuramanimeHtml(path, `anime list page ${page}`));
}

export async function searchAnime(query: string): Promise<AnimeCard[]> {
  const path = `/anime?search=${encodeURIComponent(query)}`;
  return parseAnimeCards(await fetchKuramanimeHtml(path, `pencarian "${query}"`));
}
