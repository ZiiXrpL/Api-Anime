import * as cheerio from 'cheerio';
import { fetchHtml } from '../../helpers/browserManager';
import { env } from '../../configs/env';
import { AnimeCard, HomeData } from '../../interfaces/anime.interface';
import { parseAnimeCards } from './cardParser';
import { logger } from '../../utils/logger';

export async function getHome(): Promise<HomeData> {
  const html = await fetchHtml(env.KURAMANIME_URL);
  const $ = cheerio.load(html);

  const blocks = $('.trending__product');
  let ongoing: AnimeCard[] = [];
  let completed: AnimeCard[] = [];

  logger.info(`[DIAGNOSTIK getHome] Jumlah .trending__product ditemukan: ${blocks.length}`);

  blocks.each((_, el) => {
    const heading = $(el).find('h4').first().text().trim().toLowerCase();
    const $gallery = $(el).find('.filter__gallery').first();
    const linkCount = $gallery.find('a[href*="/anime/"]').length;
    logger.info(`[DIAGNOSTIK getHome] Blok heading="${heading}", jumlah .filter__gallery=${$gallery.length}, jumlah link anime di dalamnya=${linkCount}`);
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
  });

  return { ongoing, completed };
}

async function getQuickList(category: 'ongoing' | 'finished' | 'movie', page: number): Promise<AnimeCard[]> {
  const url = `${env.KURAMANIME_URL}/quick/${category}?order_by=updated&page=${page}`;
  const html = await fetchHtml(url);
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
