import * as cheerio from 'cheerio';
import { fetchHtml } from '../../helpers/browserManager';
import { env } from '../../configs/env';
import { AnimeCard } from '../../interfaces/anime.interface';
import { parseAnimeCards } from './cardParser';

// CATATAN: halaman "/anime" Kuramanime dipakai untuk dua mode -- daftar
// A-Z semua anime (tanpa "search"), dan hasil pencarian (dengan "search").
// Keduanya diasumsikan pakai template grid #animeList yang sama seperti
// halaman genre (terverifikasi bekerja). Kalau ternyata di produksi search
// butuh parameter tambahan, ini titik paling gampang buat disesuaikan.
export async function searchAnime(query: string): Promise<AnimeCard[]> {
  const url = `${env.KURAMANIME_URL}/anime?search=${encodeURIComponent(query)}&order_by=text`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  return parseAnimeCards($, '#animeList');
}

export async function getAllAnime(page: number): Promise<AnimeCard[]> {
  const url = `${env.KURAMANIME_URL}/anime?order_by=updated&page=${page}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  return parseAnimeCards($, '#animeList');
}
