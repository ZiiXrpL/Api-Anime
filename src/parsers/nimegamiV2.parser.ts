import * as cheerio from 'cheerio';
import { AnimeCard, AnimeDetail, EpisodeItem, GenreItem, HomeData } from '../interfaces/anime.interface';

const BASE = 'https://nimegami.id';

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function abs(href: string): string {
  if (!href) return '';
  if (/^https?:\/\//i.test(href)) return href;
  return `${BASE}${href.startsWith('/') ? href : `/${href}`}`;
}

function slugFromUrl(url: string): string {
  return decodeURIComponent(url.replace(/\/$/, '').split('/').pop() || '');
}

/** Kartu home Nimegami (server-rendered): article.anime-card. */
export function parseHomeCards(html: string): AnimeCard[] {
  const $ = cheerio.load(html);
  const cards: AnimeCard[] = [];
  const seen = new Set<string>();
  $('article.anime-card').each((_, el) => {
    const $el = $(el);
    const link = $el.find('a.poster-link').first();
    const url = abs(link.attr('href') || '');
    const title = clean($el.find('a.card-title').first().text() || link.attr('aria-label')?.replace(/^Lihat\s+/i, '') || '');
    const slug = slugFromUrl(url);
    if (!title || !slug || seen.has(slug)) return;
    seen.add(slug);
    const img = $el.find('img.poster-image').first();
    let poster = img.attr('src') || '';
    if (!poster) {
      // Next.js <Image> kadang hanya mengisi srcset
      const srcset = img.attr('srcset') || img.attr('data-srcset') || '';
      poster = srcset.split(',')[0]?.trim().split(/\s+/)[0] || '';
    }
    cards.push({
      title,
      slug,
      poster: abs(poster),
      url,
      episode: clean($el.find('.card-last-episode').text()).replace(/Episode Terakhir\s*:?/i, '').trim() || undefined,
    });
  });
  return cards;
}

export function parseHome(html: string): HomeData {
  return { ongoing: parseHomeCards(html), completed: [] };
}

export function parseDetail(html: string, slug: string): AnimeDetail {
  const $ = cheerio.load(html);
  const title = clean($('h1').first().text() || $('title').first().text().replace(/\s*Sub Indo\s*\|.*$/i, ''));

  const info: Record<string, string> = {};
  $('.anime-info-summary > div').each((_, el) => {
    const key = clean($(el).find('dt').text()).toLowerCase();
    const value = clean($(el).find('dd').text());
    if (key) info[key] = value;
  });

  const genres: GenreItem[] = [];
  const seen = new Set<string>();
  $('.anime-tags a, a[href^="/genre/"]').each((_, el) => {
    const href = abs($(el).attr('href') || '');
    const name = clean($(el).text());
    const gslug = slugFromUrl(href);
    if (!name || !gslug || seen.has(gslug)) return;
    seen.add(gslug);
    genres.push({ name, slug: gslug, url: href });
  });

  const synopsis = clean($('.synopsis-block .rich-content').text());

  const episodeList: EpisodeItem[] = [];
  const seenEp = new Set<string>();
  $('a[href*="episode"], a[aria-label^="Episode"]').each((_, el) => {
    const num = clean($(el).text()).match(/\b(\d+)\b/)?.[1] || ($(el).attr('aria-label') || '').match(/Episode\s+(\d+)/i)?.[1];
    if (!num || seenEp.has(num)) return;
    seenEp.add(num);
    episodeList.push({
      title: `Episode ${num}`,
      slug: `nimegami-${slug}--ep-${num}`,
      url: abs($(el).attr('href') || ''),
    });
  });

  const poster = abs($('meta[property="og:image"]').attr('content') || $('.anime-info img').first().attr('src') || '');
  const scoreRaw = $('.anime-rating-number').first().attr('data-rating-score') || clean($('.anime-rating-number').first().text());

  return {
    title,
    slug,
    poster,
    synopsis: synopsis || undefined,
    score: scoreRaw ? String(Number(scoreRaw.replace(/[^\d.]/g, '')) || '') : undefined,
    status: info['status'] || undefined,
    type: info['tipe'] || undefined,
    releaseYear: info['musim / rilis'] || info['tahun'] || undefined,
    studio: info['studio'] || undefined,
    genres,
    episodeList,
  };
}

export function parseGenres(html: string): GenreItem[] {
  const $ = cheerio.load(html);
  const genres: GenreItem[] = [];
  const seen = new Set<string>();
  $('a[href^="/genre/"], .all-genres a, .genre-pills a').each((_, el) => {
    const href = abs($(el).attr('href') || '');
    const name = clean($(el).text());
    const slug = slugFromUrl(href);
    if (!name || !slug || seen.has(slug)) return;
    seen.add(slug);
    genres.push({ name, slug, url: href });
  });
  return genres;
}
