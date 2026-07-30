import * as cheerio from 'cheerio';
import { MovieSourceConfig } from '../configs/movieSources.config';
import {
  MovieCard,
  MovieCountryItem,
  MovieDetail,
  MovieDownloadGroup,
  MovieGenreItem,
  MovieHomeData,
  MovieStreamServer,
  MovieYearItem,
} from '../interfaces/movie.interface';

function slugFromUrl(url: string | undefined): string {
  if (!url) return '';
  const clean = url.split('?')[0]?.replace(/\/$/, '') ?? '';
  const parts = clean.split('/');
  return parts[parts.length - 1] ?? '';
}

// FIX (masalah "poster rusak di halaman detail" & "server streaming
// menolak untuk terhubung"): beberapa elemen di halaman DETAIL situs
// sumber (poster dari attribute `poster` milik <video id="videoAd">, dan
// `data-url` di #player-list a untuk tiap server streaming) ternyata bisa
// berupa URL RELATIF (mis. "/uploads/poster/x.jpg" atau
// "/embed/player.php?id=xxx"), berbeda dari kartu di listing yang sudah
// absolut. Kalau url relatif ini dipakai apa adanya sebagai <img src> atau
// <iframe src> di FRONTEND KITA, browser akan coba memuatnya relatif
// terhadap domain KITA (bukan domain situs sumber) — itulah yang
// menyebabkan poster jadi ikon gambar rusak dan server streaming
// "menolak untuk terhubung" (browser gagal connect ke path yang sebetulnya
// tidak ada di domain kita). Helper ini menyamakan semua url relatif
// menjadi absolut ke baseURL situs sumber sebelum dikirim ke client.
function resolveUrl(possiblyRelative: string | undefined, baseURL: string): string {
  if (!possiblyRelative) return '';
  const url = possiblyRelative.trim();
  if (url === '') return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return 'https:' + url;
  const base = baseURL.replace(/\/$/, '');
  return url.startsWith('/') ? base + url : base + '/' + url;
}

/**
 * Parse daftar kartu film di dalam sebuah scope (dipakai bareng oleh home,
 * list, search, genre, dsb) berdasarkan selector `list` dari
 * MovieSourceConfig. `scopeSelector` kosong berarti cari di seluruh dokumen.
 */
function parseCardsWithin($: cheerio.CheerioAPI, scopeSelector: string, source: MovieSourceConfig): MovieCard[] {
  const { list } = source.selectors;
  const posterAttr = list.posterAttr || 'src';
  const cards: MovieCard[] = [];
  const seen = new Set<string>();

  const itemSelector = scopeSelector ? `${scopeSelector} ${list.item}` : list.item;

  $(itemSelector).each((_, el) => {
    const $item = $(el);
    const href = $item.find(list.link).first().attr('href') || $item.find('a').first().attr('href') || '';
    const title = $item.find(list.title).first().text().trim();
    if (!title || !href) return;

    const slug = slugFromUrl(href);
    if (slug && seen.has(slug)) return;
    if (slug) seen.add(slug);

    const $poster = $item.find(list.poster).first();
    const poster = $poster.attr(posterAttr) || $poster.attr('data-src') || $poster.attr('src') || '';

    cards.push({
      title,
      slug,
      poster: resolveUrl(poster, source.baseURL),
      url: href,
      quality: list.quality ? $item.find(list.quality).first().text().trim() || undefined : undefined,
      rating: list.rating ? $item.find(list.rating).first().text().trim() || undefined : undefined,
      year: list.year ? $item.find(list.year).first().text().trim() || undefined : undefined,
      type: 'Movie',
    });
  });

  return cards;
}

export function parseMovieList(html: string, source: MovieSourceConfig): MovieCard[] {
  const $ = cheerio.load(html);
  return parseCardsWithin($, '', source);
}

export function parseSearchResults(html: string, source: MovieSourceConfig): MovieCard[] {
  return parseMovieList(html, source);
}

export function parseHome(html: string, source: MovieSourceConfig): MovieHomeData {
  const $ = cheerio.load(html);
  const { home } = source.selectors;

  const hasLatestContainer = $(home.latestContainer).length > 0;
  const hasPopularContainer = $(home.popularContainer).length > 0;

  const latest = parseCardsWithin($, hasLatestContainer ? home.latestContainer : '', source);
  const popular = hasPopularContainer ? parseCardsWithin($, home.popularContainer, source) : [];

  return { latest, popular };
}

export function parseGenreList(html: string, source: MovieSourceConfig): MovieGenreItem[] {
  const $ = cheerio.load(html);
  const genres: MovieGenreItem[] = [];
  const seen = new Set<string>();
  $(source.selectors.genreListItem).each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    const name = $el.text().trim();
    const slug = slugFromUrl(href);
    if (!name || !slug || seen.has(slug)) return;
    seen.add(slug);
    genres.push({ name, slug, url: href });
  });
  return genres;
}

export function parseCountryList(html: string, source: MovieSourceConfig): MovieCountryItem[] {
  const $ = cheerio.load(html);
  const countries: MovieCountryItem[] = [];
  const seen = new Set<string>();
  $(source.selectors.countryListItem).each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    const name = $el.text().trim();
    const slug = slugFromUrl(href);
    if (!name || !slug || seen.has(slug)) return;
    seen.add(slug);
    countries.push({ name, slug, url: href });
  });
  return countries;
}

export function parseYearList(html: string, source: MovieSourceConfig): MovieYearItem[] {
  const $ = cheerio.load(html);
  const years: MovieYearItem[] = [];
  const seen = new Set<string>();
  $(source.selectors.yearListItem).each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    const year = $el.text().trim();
    if (!year || seen.has(year)) return;
    seen.add(year);
    years.push({ year, url: href });
  });
  return years;
}

export function parseMovieDetail(html: string, source: MovieSourceConfig, id: string): MovieDetail {
  const $ = cheerio.load(html);
  const d = source.selectors.detail;
  const posterAttr = d.posterAttr || 'src';

  const genres: MovieGenreItem[] = [];
  $(d.genreItem).each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    const name = $el.text().trim();
    if (!name) return;
    genres.push({ name, slug: slugFromUrl(href), url: href });
  });

  const cast: string[] = [];
  if (d.castItem) {
    $(d.castItem).each((_, el) => {
      const name = $(el).text().trim();
      if (name) cast.push(name);
    });
  }

  const streamServers: MovieStreamServer[] = [];
  if (d.streamServerItem) {
    const urlAttr = d.streamServerUrlAttr || 'href';
    $(d.streamServerItem).each((_, el) => {
      const $el = $(el);
      const url = $el.attr(urlAttr) || $el.attr('href') || $el.attr('data-src') || '';
      const name = $el.text().trim() || 'Server';
      if (!url) return;
      streamServers.push({
        name,
        quality: $el.attr('data-quality') || undefined,
        url: resolveUrl(url, source.baseURL),
      });
    });
  }

  const downloadList: MovieDownloadGroup[] = [];
  if (d.downloadGroupItem) {
    $(d.downloadGroupItem).each((_, el) => {
      const $el = $(el);
      const qualityLabel = d.downloadGroupQualityLabel
        ? $el.find(d.downloadGroupQualityLabel).first().text().trim()
        : '';
      const quality = qualityLabel || $el.text().split(':')[0]?.trim() || 'Unknown';
      const linkSelector = d.downloadLinkItem || 'a';
      const links = $el
        .find(linkSelector)
        .map((__, a) => ({
          provider: $(a).text().trim(),
          url: resolveUrl($(a).attr('href'), source.baseURL),
        }))
        .get()
        .filter((l) => l.url);
      if (links.length > 0) {
        downloadList.push({ quality, links });
      }
    });
  }

  const title = $(d.title).first().text().trim();
  // Beberapa situs (mis. tema Lk21) memotong sinopsis dengan "..." di teks
  // tampilan, tapi menyimpan versi lengkapnya di attribute data-full.
  const $synopsis = d.synopsis ? $(d.synopsis).first() : null;
  const synopsis = $synopsis?.attr('data-full')?.trim() || $synopsis?.text().trim() || undefined;
  // Kalau config tidak menyediakan selector releaseYear (situs tidak punya
  // elemen tahun rilis sendiri), coba tebak dari angka 4 digit di judul,
  // mis. "Hold Me Back (2020)" -> "2020".
  const releaseYearFromSelector = d.releaseYear ? $(d.releaseYear).first().text().trim() : '';
  const releaseYear = releaseYearFromSelector || title.match(/\((\d{4})\)/)?.[1] || undefined;

  return {
    title,
    slug: id,
    poster: resolveUrl(
      $(d.poster).first().attr(posterAttr) || $(d.poster).first().attr('data-src') || '',
      source.baseURL,
    ),
    synopsis,
    rating: d.rating ? $(d.rating).first().text().trim() || undefined : undefined,
    quality: d.quality ? $(d.quality).first().text().trim() || undefined : undefined,
    duration: d.duration ? $(d.duration).first().text().trim() || undefined : undefined,
    releaseYear,
    country: d.country ? $(d.country).first().text().trim() || undefined : undefined,
    director: d.director ? $(d.director).first().text().trim() || undefined : undefined,
    cast,
    genres,
    streamServers,
    downloadList,
  };
}
