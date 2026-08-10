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

// Fungsi-fungsi parser CSS (parseCardsWithin, parseHome, parseGenreList,
// dst di bawah) hanya dipanggil scraper saat source.parserType === 'css'
// (lihat movieScraper.ts) — tapi `selectors` sekarang opsional di tipe
// MovieSourceConfig (supaya source berbasis JSON seperti NatGeo tidak
// wajib mengisinya). Helper ini yang memastikan ke TypeScript (dan runtime)
// bahwa `selectors` pasti ada sebelum dipakai fungsi-fungsi CSS tsb.
function requireSelectors(source: MovieSourceConfig): NonNullable<MovieSourceConfig['selectors']> {
  if (!source.selectors) {
    throw new Error(
      `Source "${source.name}" tidak punya "selectors" tapi dipakai lewat parser CSS — set parserType yang benar di movieSources.config.ts`,
    );
  }
  return source.selectors;
}

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
  const { list } = requireSelectors(source);
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

// FIX (masalah "search film selalu kosong"): hasil pencarian di situs ini
// TIDAK ada di HTML sama sekali — dimuat lewat AJAX oleh JS halaman search ke
// endpoint JSON di domain terpisah (disamarkan, dibaca dari atribut
// data-search_url di <body> halaman utama, contoh nyata yang ditemukan:
// "https://gudangvape.com/"). Dua fungsi di bawah menggantikan pendekatan
// scraping-HTML lama yang tidak akan pernah menemukan apa pun untuk search.

export interface MovieSearchApiConfig {
  searchUrl: string;
  thumbnailUrl: string;
}

export function parseSearchConfig(html: string): MovieSearchApiConfig | null {
  const $ = cheerio.load(html);
  const body = $('body').first();
  const searchUrl = (body.attr('data-search_url') || '').trim();
  const thumbnailUrl = (body.attr('data-thumbnail_url') || '').trim();
  if (searchUrl === '') return null;
  return { searchUrl, thumbnailUrl };
}

function resolveSearchPoster(poster: string | undefined, thumbnailUrl: string): string {
  if (!poster) return '';
  if (/^https?:\/\//i.test(poster)) return poster;
  if (thumbnailUrl === '') return poster;
  return thumbnailUrl.replace(/\/$/, '') + '/' + poster.replace(/^\//, '');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseSearchApiResponse(json: any, thumbnailUrl: string): MovieCard[] {
  const items: unknown[] = Array.isArray(json?.data) ? json.data : Array.isArray(json?.items) ? json.items : [];

  return items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((raw): MovieCard | null => {
      const a = raw as Record<string, unknown>;
      const slug = String(a.slug ?? '').replace(/^\//, '');
      const rawTitle = String(a.title ?? '');
      const title = rawTitle.replace(/\(\d{4}\)$/, '').trim();
      if (slug === '' || title === '') return null;

      const rating = Number(a.rating);
      return {
        title,
        slug,
        poster: resolveSearchPoster(a.poster as string | undefined, thumbnailUrl),
        url: '/' + slug,
        quality: a.quality ? String(a.quality) : undefined,
        rating: rating > 0 ? String(rating) : undefined,
        year: a.year ? String(a.year) : undefined,
        type: 'Movie',
      };
    })
    .filter((c): c is MovieCard => c !== null);
}

export function parseHome(html: string, source: MovieSourceConfig): MovieHomeData {
  const $ = cheerio.load(html);
  const { home } = requireSelectors(source);

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
  $(requireSelectors(source).genreListItem).each((_, el) => {
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
  $(requireSelectors(source).countryListItem).each((_, el) => {
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
  $(requireSelectors(source).yearListItem).each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    const year = $el.text().trim();
    if (!year || seen.has(year)) return;
    seen.add(year);
    years.push({ year, url: href });
  });
  return years;
}

// ============================================================================
// PARSER NATGEO (JSON tersuntik) — dipakai kalau source.parserType ===
// 'natgeo-json'. Situs nationalgeographic.com menaruh seluruh state halaman
// (termasuk url gambar ASLI, yang tidak ada di HTML/<img> biasa karena
// lazy-load React) sebagai satu blok JSON:
//   <script>window['__CONFIG__']={...JSON raksasa...}</script>
// Parser di bawah ini TIDAK memakai cheerio/selector sama sekali — cukup
// ekstrak teks JSON-nya lalu JSON.parse, kemudian jalan-jalani (walk)
// objeknya secara rekursif buat mengumpulkan semua "kartu artikel".
// ============================================================================

const NATGEO_CONFIG_MARKER = "window['__CONFIG__']=";

/**
 * Ekstrak & parse blok JSON window['__CONFIG__']={...} dari HTML mentah.
 * Dicari manual (bukan regex sederhana) dengan menghitung depth kurung
 * kurawal supaya tetap benar meski JSON-nya berisi banyak nested object
 * dan string yang mengandung karakter "{"/"}" di dalamnya.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractNatGeoConfig(html: string): any | null {
  const idx = html.indexOf(NATGEO_CONFIG_MARKER);
  if (idx === -1) return null;
  const jsonStart = idx + NATGEO_CONFIG_MARKER.length;

  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let end = -1;

  for (let i = jsonStart; i < html.length; i++) {
    const ch = html[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === '\\') {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  if (end === -1) return null;

  try {
    return JSON.parse(html.slice(jsonStart, end));
  } catch {
    return null;
  }
}

interface NatGeoArticleRaw {
  title: string;
  url: string;
  poster: string;
  abstract?: string;
  tags: string[];
}

/**
 * Jalan-jalani (walk) JSON hasil extractNatGeoConfig secara rekursif,
 * mengumpulkan tiap object yang "berbentuk" kartu artikel: punya title,
 * img.src, dan url artikel (dari ctas[0].url, atau field url/href
 * langsung). Pendekatan rekursif generik dipakai (bukan path field yang
 * di-hardcode) karena NatGeo menaruh kartu yang sama di banyak tempat
 * berbeda di JSON (nav dropdown, carousel, grid utama, dst) dengan
 * kedalaman nesting yang bisa beda-beda antar halaman.
 */
function collectNatGeoArticles(node: unknown, seenUrls: Set<string>, out: NatGeoArticleRaw[]): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) collectNatGeoArticles(item, seenUrls, out);
    return;
  }

  const obj = node as Record<string, unknown>;

  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const img = obj.img as Record<string, unknown> | undefined;
  const posterSrc = img && typeof img.src === 'string' ? img.src : '';
  const ctas = Array.isArray(obj.ctas) ? (obj.ctas as Record<string, unknown>[]) : undefined;
  const ctaUrl = ctas && ctas.length > 0 && typeof ctas[0]?.url === 'string' ? (ctas[0].url as string) : '';
  const directUrl = typeof obj.url === 'string' ? obj.url : '';
  const href = typeof obj.href === 'string' ? obj.href : '';
  const url = ctaUrl || directUrl || href;

  // Hanya ambil yang benar-benar artikel (path-nya mengandung "/article/")
  // supaya tidak ikut kebawa link section/nav/footer yang juga punya title.
  if (title && posterSrc && url && /\/article\//.test(url) && !seenUrls.has(url)) {
    seenUrls.add(url);
    const rawTags = Array.isArray(obj.tags) ? (obj.tags as Record<string, unknown>[]) : [];
    const tags = rawTags
      .map((t) => (typeof t?.name === 'string' ? t.name.trim() : ''))
      .filter((t) => t !== '');
    const abstract = typeof obj.abstract === 'string' ? obj.abstract.trim() : undefined;
    out.push({ title, url, poster: posterSrc, abstract, tags });
  }

  for (const key of Object.keys(obj)) {
    collectNatGeoArticles(obj[key], seenUrls, out);
  }
}

function natGeoArticleToCard(a: NatGeoArticleRaw): MovieCard {
  return {
    title: a.title,
    slug: slugFromUrl(a.url),
    poster: a.poster,
    url: a.url,
    quality: undefined,
    rating: undefined,
    year: undefined,
    type: a.tags[0] || 'Article',
  };
}

/** Daftar kartu artikel NatGeo dari satu halaman (dipakai buat home & list). */
export function parseNatGeoList(html: string): MovieCard[] {
  const config = extractNatGeoConfig(html);
  if (!config) return [];
  const seen = new Set<string>();
  const raws: NatGeoArticleRaw[] = [];
  collectNatGeoArticles(config, seen, raws);
  return raws.map(natGeoArticleToCard);
}

export function parseNatGeoHome(html: string): MovieHomeData {
  const all = parseNatGeoList(html);
  // NatGeo tidak punya widget "populer" terpisah dari "terbaru" di halaman
  // section seperti ini -> popular dikosongkan, semua masuk latest.
  return { latest: all, popular: [] };
}

/**
 * Cari 1 artikel spesifik (by slug segmen terakhir) dari config JSON sebuah
 * halaman, lalu petakan ke MovieDetail. `movieScraper.fetchDetail` yang
 * menentukan section mana yang dicoba (lihat catatan di sana).
 */
export function parseNatGeoDetail(html: string, id: string): MovieDetail | null {
  const config = extractNatGeoConfig(html);
  if (!config) return null;

  const seen = new Set<string>();
  const raws: NatGeoArticleRaw[] = [];
  collectNatGeoArticles(config, seen, raws);

  const match = raws.find((a) => slugFromUrl(a.url) === id);
  if (!match) return null;

  return {
    title: match.title,
    slug: id,
    poster: match.poster,
    synopsis: match.abstract,
    rating: undefined,
    quality: undefined,
    duration: undefined,
    releaseYear: undefined,
    country: undefined,
    director: undefined,
    cast: [],
    genres: match.tags.map((name) => ({
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      url: '',
    })),
    streamServers: [],
    downloadList: [],
  };
}

export function parseMovieDetail(html: string, source: MovieSourceConfig, id: string): MovieDetail {
  const $ = cheerio.load(html);
  const d = requireSelectors(source).detail;
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
