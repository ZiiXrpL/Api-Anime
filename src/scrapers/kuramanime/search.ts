import * as cheerio from 'cheerio';
import { kuramanimeClient } from '../../helpers/axiosClient';
import { AnimeCard } from '../../interfaces/anime.interface';
import { parseAnimeCards } from './cardParser';

// CATATAN: halaman "/anime" Kuramanime dipakai untuk dua mode -- daftar
// A-Z semua anime (tanpa "search"), dan hasil pencarian (dengan "search").
// Keduanya diasumsikan pakai template grid #animeList yang sama seperti
// halaman genre (terverifikasi bekerja tanpa JS). Kalau ternyata di
// produksi search butuh parameter tambahan, ini titik paling gampang buat
// disesuaikan.
export async function searchAnime(query: string): Promise<AnimeCard[]> {
  const { data: html } = await kuramanimeClient.get('/anime', {
    params: { search: query, order_by: 'text' },
  });
  const $ = cheerio.load(html);
  return parseAnimeCards($, '#animeList');
}

export async function getAllAnime(page: number): Promise<AnimeCard[]> {
  const { data: html } = await kuramanimeClient.get('/anime', {
    params: { order_by: 'updated', page },
  });
  const $ = cheerio.load(html);
  return parseAnimeCards($, '#animeList');
}
