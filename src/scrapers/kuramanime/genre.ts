import * as cheerio from 'cheerio';
import { kuramanimeClient } from '../../helpers/axiosClient';
import { AnimeCard, GenreItem } from '../../interfaces/anime.interface';
import { parseAnimeCards } from './cardParser';

export async function getGenreList(): Promise<GenreItem[]> {
  const { data: html } = await kuramanimeClient.get('/properties/genre');
  const $ = cheerio.load(html);

  const genres: GenreItem[] = [];
  const seen = new Set<string>();

  $('a[href*="/properties/genre/"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    const match = href.match(/\/properties\/genre\/([a-z0-9-]+)\s*$/i);
    if (!match) return; // lewati link "Daftar Genre" (index) itu sendiri
    const slug = match[1];
    const name = $a.text().trim();
    if (!name || seen.has(slug)) return;
    seen.add(slug);
    genres.push({ name, slug, url: href });
  });

  return genres;
}

export async function getAnimeByGenre(slug: string, page: number): Promise<AnimeCard[]> {
  const { data: html } = await kuramanimeClient.get(`/properties/genre/${slug}`, {
    params: { page },
  });
  const $ = cheerio.load(html);
  return parseAnimeCards($, '#animeList');
}
