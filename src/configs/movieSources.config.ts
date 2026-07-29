import { MovieListFilters } from '../interfaces/movie.interface';

/**
 * ============================================================================
 * MOVIE SOURCE CONFIG
 * ============================================================================
 * File inilah SATU-SATUNYA tempat yang perlu diubah kalau mau:
 *  - Mengganti website sumber scraping film (baseURL, path, atau selector CSS)
 *  - Menambah source kedua/ketiga (tinggal tambah 1 object baru di MOVIE_SOURCES)
 *
 * Parser (parsers/movie.parser.ts), scraper (scrapers/movie/movieScraper.ts),
 * service, controller, dan route TIDAK PERNAH menyebut nama/struktur website
 * secara hardcode. Semuanya generik dan hanya membaca dari object config ini.
 *
 * Untuk menambah source baru:
 *   1. Duplikat salah satu object MovieSourceConfig di bawah.
 *   2. Sesuaikan baseURL, paths, dan selectors dengan struktur HTML source baru.
 *   3. Push object tersebut ke array MOVIE_SOURCES.
 * Selesai — SourceManager akan otomatis mencoba source tambahan itu sebagai
 * fallback berikutnya, tanpa menyentuh kode lain sama sekali.
 * ============================================================================
 */

function getEnv(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : fallback;
}

function getEnvNumber(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export interface MovieListSelectors {
  /** Selector container per-item kartu film (grid/list) */
  item: string;
  /** Selector judul, relatif terhadap `item` */
  title: string;
  /** Selector elemen <a> yang punya href menuju detail, relatif terhadap `item` */
  link: string;
  /** Selector elemen <img> poster, relatif terhadap `item` */
  poster: string;
  /** Attribute yang dipakai poster (default 'src'), beberapa situs pakai lazy-load 'data-src' */
  posterAttr?: string;
  quality?: string;
  rating?: string;
  year?: string;
}

export interface MovieDetailSelectors {
  title: string;
  poster: string;
  posterAttr?: string;
  synopsis: string;
  rating?: string;
  quality?: string;
  duration?: string;
  releaseYear?: string;
  country?: string;
  director?: string;
  castItem?: string;
  genreItem: string;
  streamServerItem?: string;
  streamServerUrlAttr?: string;
  downloadGroupItem?: string;
  downloadGroupQualityLabel?: string;
  downloadLinkItem?: string;
}

export interface MovieSourceSelectors {
  home: {
    latestContainer: string;
    popularContainer: string;
  };
  list: MovieListSelectors;
  detail: MovieDetailSelectors;
  genreListItem: string;
  countryListItem: string;
  yearListItem: string;
}

export interface MovieSourcePaths {
  home: string;
  list: (page: number, filters?: MovieListFilters) => string;
  search: (query: string) => string;
  detail: (id: string) => string;
  genreList: string;
  genreDetail: (slug: string, page: number) => string;
  countryList: string;
  yearList: string;
  latest: (page: number) => string;
  popular: (page: number) => string;
}

export interface MovieSourceConfig {
  /** Nama unik source, dipakai sebagai identitas di field `source` pada response */
  name: string;
  baseURL: string;
  paths: MovieSourcePaths;
  selectors: MovieSourceSelectors;
}

function buildQuery(filters?: MovieListFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.genre) params.set('genre', filters.genre);
  if (filters.country) params.set('country', filters.country);
  if (filters.year) params.set('year', filters.year);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Source default (placeholder).
 * GANTI `MOVIE_SOURCE_A_URL` di .env dan sesuaikan selector di bawah dengan
 * struktur HTML website source film Anda yang sebenarnya.
 */
const sourceA: MovieSourceConfig = {
  name: getEnv('MOVIE_SOURCE_A_NAME', 'SourceA'),

  baseURL: getEnv('MOVIE_SOURCE_A_URL', 'https://tv12.lk21official.cc'),
  paths: {
    home: '/',
    // Situs sumber tidak punya path /movies — daftar utama dipakai lewat
    // /latest (nav "TERBARU") sesuai markup yang dikirim user.
    list: (page, filters) => {
      const base = page > 1 ? `/latest/page/${page}` : '/latest';
      return `${base}${buildQuery(filters)}`;
    },
    search: (query) => `/search/?s=${encodeURIComponent(query)}`,
    detail: (id) => `/${id}`,
    // Link genre/negara/tahun ada di dropdown nav di SETIAP halaman (termasuk
    // homepage), bukan di halaman index tersendiri — jadi cukup fetch '/'.
    genreList: '/',
    genreDetail: (slug, page) => (page > 1 ? `/genre/${slug}/page/${page}` : `/genre/${slug}`),
    countryList: '/',
    yearList: '/',
    latest: (page) => (page > 1 ? `/latest/page/${page}` : '/latest'),
    popular: (page) => (page > 1 ? `/populer/page/${page}` : '/populer'),
  },
  selectors: {
    home: {
      // "Film Terbaru" = widget dengan data-type="latest-movies"
      latestContainer: '.widget[data-type="latest-movies"]',
      // Tidak ada widget "populer" eksplisit di homepage; slider Film
      // Unggulan (.featured) adalah yang paling mendekati (rating tertinggi).
      popularContainer: '.featured',
    },
    list: {
      // Kartu film ada di dalam <li class="slider"><article>...</article></li>,
      // dipakai bersama baik di .featured maupun tiap .widget.
      item: 'li.slider article',
      title: '.poster-title',
      link: 'a',
      poster: 'img',
      posterAttr: 'src',
      // Badge kualitas pakai class "label label-HD", bukan ".quality"
      quality: '.label',
      rating: '.rating',
      year: '.year',
    },
    detail: {
      // Halaman detail asli cuma punya satu <h1>, tanpa class.
      title: 'h1',
      // Poster paling stabil diambil dari attribute poster= milik <video
      // id="videoAd">, bukan dari <img> lazyload yang class/attr-nya beda-beda.
      poster: '#videoAd',
      posterAttr: 'poster',
      // .synopsis teks-nya sengaja dipotong ("...") di HTML; teks lengkap
      // ada di attribute data-full (ditangani khusus di movie.parser.ts).
      synopsis: '.synopsis',
      rating: '.rating-number',
      // .info-tag berisi 3 <span>: [tipe rilis, resolusi, durasi] tanpa class
      // pembeda, jadi diambil lewat posisi anak pertama & terakhir.
      quality: '.info-tag span:first-child',
      duration: '.info-tag span:last-child',
      // Tidak ada elemen tahun rilis yang berdiri sendiri di halaman detail
      // (cuma nempel di judul "Hold Me Back (2020)") — diekstrak dari title
      // via regex fallback di movie.parser.ts, jadi sengaja dikosongkan di sini.
      country: '.tag-list a[href^="/country/"]',
      director: 'a[href^="/director/"]',
      castItem: 'a[href^="/artist/"]',
      genreItem: '.tag-list a[href^="/genre/"]',
      streamServerItem: '#player-list a',
      streamServerUrlAttr: 'data-url',
      // Situs ini tidak punya daftar download per-kualitas — cuma satu
      // tombol DOWNLOAD yang mengarah ke mirror eksternal (mis. dadadidi.de).
      downloadGroupItem: '.movie-action',
      downloadGroupQualityLabel: 'a.btn:not(.btn-secondary)',
      downloadLinkItem: 'a.btn:not(.btn-secondary)',
    },
    // Di markup nav situs asli, link genre/negara/tahun tidak punya class
    // khusus (mis. ".genre a" tidak ada) — yang konsisten cuma pola href-nya.
    genreListItem: 'a[href^="/genre/"]',
    countryListItem: 'a[href^="/country/"]',
    yearListItem: 'a[href^="/year/"]',
  },
};

export const MOVIE_SOURCES: MovieSourceConfig[] = [sourceA];

/**
 * Ambil daftar source yang aktif. Bisa dibatasi lewat env MOVIE_ACTIVE_SOURCES
 * (comma-separated nama source), misal: "SourceA,SourceB".
 * Kalau tidak diset, semua source di MOVIE_SOURCES dipakai (urut sesuai array
 * = urutan prioritas fallback).
 */
export function getActiveMovieSources(): MovieSourceConfig[] {
  const raw = getEnv('MOVIE_ACTIVE_SOURCES', '');
  if (!raw) return MOVIE_SOURCES;
  const names = raw
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  const filtered = MOVIE_SOURCES.filter((s) => names.includes(s.name));
  return filtered.length > 0 ? filtered : MOVIE_SOURCES;
}

export const MOVIE_CACHE_TTL = {
  HOME: getEnvNumber('MOVIE_CACHE_TTL_HOME', 600),
  LIST: getEnvNumber('MOVIE_CACHE_TTL_LIST', 1800),
  DETAIL: getEnvNumber('MOVIE_CACHE_TTL_DETAIL', 3600),
  TAXONOMY: getEnvNumber('MOVIE_CACHE_TTL_TAXONOMY', 21600),
};
