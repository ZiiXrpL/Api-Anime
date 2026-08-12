import * as cheerio from 'cheerio';
import { MovieSourceConfig } from '../configs/movieSources.config';
import {
  MovieCard,
  MovieDetail,
  MovieDownloadLink,
  MovieGenreItem,
  MovieServerOption,
} from '../interfaces/movie.interface';

function slugFromUrl(url: string | undefined): string {
  if (!url) return '';
  const clean = url.split('?')[0]?.replace(/\/$/, '') ?? '';
  const parts = clean.split('/');
  return parts[parts.length - 1] ?? '';
}

/**
 * Parse daftar kartu film. Dipakai bareng oleh list utama, pagination,
 * genre archive, dan search — keempatnya pakai markup HTML yang identik
 * (container `#gmr-main-load`, item `article[id^="post-"]`), dikonfirmasi
 * dari list.html, list-page2.html, genre-detail.html, dan search.html.
 */
export function parseMovieCards(html: string, source: MovieSourceConfig): MovieCard[] {
  const $ = cheerio.load(html);
  const { list } = source.selectors;
  const posterAttr = list.posterAttr || 'src';
  const cards: MovieCard[] = [];
  const seen = new Set<string>();

  $(list.item).each((_, el) => {
    const $item = $(el);
    const $titleLink = $item.find(list.titleLink).first();
    const href = $titleLink.attr('href') || '';
    const title = $titleLink.text().trim();
    if (!title || !href) return;

    const slug = slugFromUrl(href);
    if (slug && seen.has(slug)) return;
    if (slug) seen.add(slug);

    const $poster = $item.find(list.poster).first();
    const poster = $poster.attr(posterAttr) || $poster.attr('data-src') || $poster.attr('src') || '';

    const datetime = list.date ? $item.find(list.date).first().attr('datetime') : undefined;
    const year = datetime ? datetime.slice(0, 4) : undefined;

    cards.push({
      title,
      slug,
      poster,
      url: href,
      quality: list.quality ? $item.find(list.quality).first().text().trim() || undefined : undefined,
      rating: list.rating ? $item.find(list.rating).first().text().trim() || undefined : undefined,
      duration: list.duration ? $item.find(list.duration).first().text().trim() || undefined : undefined,
      year,
      type: 'Movie',
    });
  });

  return cards;
}

/**
 * Ambil daftar genre dari dropdown nav "Genre" (ada di HEADER setiap
 * halaman, termasuk homepage) — dikonfirmasi dari list.html:
 * <li class="menu-item-has-children"><a><span>Genre</span></a>
 *   <ul class="sub-menu">...</ul>
 * </li>
 * Dibedakan dari dropdown "Country"/"Year" (struktur sama) lewat teks
 * <span itemprop="name"> pertamanya, bukan lewat ID/class (ID menu-item-*
 * itu angka acak yang bisa beda tiap request).
 */
export function parseGenreList(html: string, source: MovieSourceConfig): MovieGenreItem[] {
  const $ = cheerio.load(html);
  const genres: MovieGenreItem[] = [];
  const seen = new Set<string>();

  $(source.genreMenuItem).each((_, el) => {
    const $li = $(el);
    const $topLink = $li.children('a').first();
    const label = $topLink.find('span[itemprop="name"]').first().text().trim();
    if (label !== 'Genre') return;

    const $subMenu = $li.children('ul.sub-menu').first();
    $subMenu.children('li').each((__, subLi) => {
      const $a = $(subLi).children('a').first();
      const href = $a.attr('href') || '';
      const name = $a.find('span[itemprop="name"]').first().text().trim() || $a.text().trim();
      const slug = slugFromUrl(href);
      if (!name || !slug || seen.has(slug)) return;
      seen.add(slug);
      genres.push({ name, slug, url: href });
    });
  });

  return genres;
}

/**
 * Ambil satu baris metadata `.gmr-moviedata` berdasarkan teks label
 * `<strong>`-nya (mis. "Genre:", "Year:", "Country:"). Situs sumber tidak
 * kasih class pembeda per-field, cuma teks label, jadi ini dicocokkan
 * manual alih-alih pakai selector CSS per field.
 */
function findMoviedataByLabel(
  $: cheerio.CheerioAPI,
  source: MovieSourceConfig,
  label: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const { moviedataItem } = source.selectors.detail;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let found: any;
  $(moviedataItem).each((_, el) => {
    const $el = $(el);
    const strongText = $el.find('strong').first().text().trim().toLowerCase();
    if (strongText.startsWith(label.toLowerCase())) {
      found = $el;
    }
  });
  return found;
}

export interface ParsedMovieDetail {
  detail: MovieDetail;
  /** post_id dipakai buat resolve embed player lewat admin-ajax.php (lihat movieScraper.fetchWatch) */
  postId: string;
}

export function parseMovieDetail(html: string, source: MovieSourceConfig, slug: string): ParsedMovieDetail {
  const $ = cheerio.load(html);
  const d = source.selectors.detail;
  const posterAttr = d.posterAttr || 'src';

  const title = $(d.title).first().text().trim();
  const poster = $(d.poster).first().attr(posterAttr) || '';
  const synopsis = $(d.synopsis).first().text().trim() || undefined;
  const rating = d.ratingValue ? $(d.ratingValue).first().text().trim() || undefined : undefined;

  const genreRow = findMoviedataByLabel($, source, 'Genre');
  const genres: MovieGenreItem[] = [];
  if (genreRow) {
    genreRow.find(d.genreItem).each((_: number, el: any) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const name = $el.text().trim();
      if (!name) return;
      genres.push({ name, slug: slugFromUrl(href), url: href });
    });
  }

  const qualityRow = findMoviedataByLabel($, source, 'Quality');
  const quality = qualityRow ? qualityRow.find('a').first().text().trim() || undefined : undefined;

  const yearRow = findMoviedataByLabel($, source, 'Year');
  const releaseYear = yearRow ? yearRow.find('a').first().text().trim() || undefined : undefined;

  const countryRow = findMoviedataByLabel($, source, 'Country');
  const country = countryRow
    ? countryRow
        .find(d.countryItem)
        .map((_: number, el: any) => $(el).text().trim())
        .get()
        .filter(Boolean)
        .join(', ') || undefined
    : undefined;

  const languageRow = findMoviedataByLabel($, source, 'Language');
  const language = languageRow ? languageRow.find('span').last().text().trim() || undefined : undefined;

  const directorRow = findMoviedataByLabel($, source, 'Director');
  const director = directorRow ? directorRow.find(d.directorItem).first().text().trim() || undefined : undefined;

  const castRow = findMoviedataByLabel($, source, 'Cast');
  const cast: string[] = castRow
    ? castRow
        .find(d.castItem)
        .map((_: number, el: any) => $(el).text().trim())
        .get()
        .filter(Boolean)
    : [];

  const postId = $(d.playerContainer).first().attr(d.playerContainerIdAttr) || '';
  const servers: MovieServerOption[] = [];
  $(d.serverTabItem).each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    const tab = href.replace('#', '').trim();
    const name = $el.text().trim();
    if (!tab || !name) return;
    servers.push({ name, tab });
  });

  const downloadList: MovieDownloadLink[] = $(d.downloadItem)
    .map((_, el) => {
      const $el = $(el);
      return { provider: $el.text().trim() || 'Download', url: $el.attr('href') || '' };
    })
    .get()
    .filter((l) => l.url);

  return {
    detail: {
      title,
      slug,
      poster,
      synopsis,
      rating,
      quality,
      releaseYear,
      country,
      language,
      director,
      cast,
      genres,
      servers,
      downloadList,
    },
    postId,
  };
}

/**
 * Extract URL embed <iframe> dari response HTML mentah admin-ajax.php
 * (dikonfirmasi dari player-p1.html/p2.html/p3.html):
 * <div class="gmr-embed-responsive clearfix"><iframe src="...">...</iframe></div>
 */
export function parseStreamEmbedUrl(html: string): string {
  const $ = cheerio.load(html);
  return $('.gmr-embed-responsive iframe').first().attr('src') || $('iframe').first().attr('src') || '';
}
