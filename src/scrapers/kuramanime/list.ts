import * as cheerio from 'cheerio';
import { kuramanimeClient } from '../../helpers/axiosClient';
import { AnimeCard, HomeData } from '../../interfaces/anime.interface';
import { parseAnimeCards } from './cardParser';

export async function getHome(): Promise<HomeData> {
  const { data: html } = await kuramanimeClient.get('/');
  const $ = cheerio.load(html);

  // Beranda Kuramanime berisi 3 blok ".trending__product" berurutan:
  // Sedang Tayang, Selesai Tayang, Film Layar Lebar. Dicocokkan lewat teks
  // <h4> supaya tidak tergantung urutan kalau suatu saat berubah.
  const blocks = $('.trending__product');
  let ongoing: AnimeCard[] = [];
  let completed: AnimeCard[] = [];

  blocks.each((_, el) => {
    const heading = $(el).find('h4').first().text().trim().toLowerCase();
    const $gallery = $(el).find('.filter__gallery').first();
    const cards: AnimeCard[] = [];

    $gallery.find('a[href*="/anime/"]').each((__, a) => {
      const $a = $(a);
      const href = $a.attr('href') || '';
      const idMatch = href.match(/\/anime\/(\d+)/);
      if (!idMatch) return;
      const $item = $a.find('.product__sidebar__view__item').first();
      if ($item.length === 0) return;

      const title = $item.find('h5.sidebar-title-h5').first().text().trim();
      if (!title) return;
      const poster = $item.attr('data-setbg') || '';
      const epText = $item.find('.ep').first().text().replace(/\s+/g, ' ').trim();
      const isEpisodeCount = /^Ep\s/i.test(epText);
      const view = $item.find('.view').first().text().trim();
      const status = $item.find('.d-none span').first().text().trim() || undefined;

      cards.push({
        title,
        slug: idMatch[1],
        poster,
        url: href,
        episode: isEpisodeCount ? epText.replace(/^Ep\s*/i, '') : undefined,
        score: !isEpisodeCount && epText ? epText.replace(/[^\d.]/g, '') : undefined,
        status,
        type: view || undefined,
      });
    });

    if (heading.includes('sedang tayang')) {
      ongoing = cards;
    } else if (heading.includes('selesai tayang')) {
      completed = cards;
    }
    // "Film Layar Lebar" (movie) sengaja tidak dipakai di HomeData -- ada
    // endpoint getMovies() sendiri buat itu, sama seperti Otakudesu/Samehadaku.
  });

  return { ongoing, completed };
}

async function getQuickList(category: 'ongoing' | 'finished' | 'movie', page: number): Promise<AnimeCard[]> {
  const { data: html } = await kuramanimeClient.get(`/quick/${category}`, {
    params: { order_by: 'updated', page },
  });
  const $ = cheerio.load(html);
  return parseAnimeCards($, '#animeList');
}

export function getOngoing(page: number): Promise<AnimeCard[]> {
  return getQuickList('ongoing', page);
}

export function getCompleted(page: number): Promise<AnimeCard[]> {
  return getQuickList('finished', page);
}

export function getMovies(page: number): Promise<AnimeCard[]> {
  return getQuickList('movie', page);
}
