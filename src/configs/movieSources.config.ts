import { MovieListFilters } from '../interfaces/movie.interface';

/**
 * ============================================================================
 * MOVIE SOURCE CONFIG
 * ============================================================================
 * File inilah SATU-SATUNYA tempat yang perlu diubah kalau mau:
 *  - Mengganti website sumber scraping (baseURL, path, atau selector CSS)
 *  - Menambah source kedua/ketiga (tinggal tambah 1 object baru di MOVIE_SOURCES)
 *
 * ----------------------------------------------------------------------------
 * UPDATE — source diganti dari lk21-style (streaming film) ke
 * nationalgeographic.com (artikel/majalah).
 * ----------------------------------------------------------------------------
 * PENTING: NationalGeographic.com bukan situs streaming film — jadi field
 * bawaan modul ini yang aslinya didesain untuk film (streamServers,
 * downloadList, quality, duration) akan SELALU KOSONG untuk source ini.
 * Yang terisi cuma: title, poster, url, genre (dipetakan dari section/topic
 * NatGeo seperti "Animals"/"Science"), dan synopsis (dari field `abstract`).
 *
 * NationalGeographic.com juga TIDAK bisa di-scrape pakai CSS selector biasa
 * (cheerio) seperti situs lk21 — kontennya React/Next.js dan gambar asli
 * cuma ada di lazy-load JS, BUKAN di HTML awal. Untungnya situs ini
 * menyuntik seluruh data halaman (termasuk url gambar asli) sebagai satu
 * blok JSON di `<script>window['__CONFIG__']={...}</script>`. Karena itu
 * source ini pakai `parserType: 'natgeo-json'` — parsernya (lihat
 * `parseNatGeoList`/`parseNatGeoDetail` di parsers/movie.parser.ts) TIDAK
 * memakai `selectors` sama sekali, cukup ekstrak & jalan-jalani JSON itu.
 *
 * Untuk menambah source baru:
 *   1. Kalau source baru berbasis CSS (HTML statis biasa): duplikat pola
 *      `sourceA` versi lama (cheerio + selectors), set parserType: 'css'.
 *   2. Kalau source baru juga berbasis JSON tersuntik seperti ini: duplikat
 *      pola `sourceNatGeo`, sesuaikan `configVarMarker` & parser JSON-nya.
 *   3. Push object tersebut ke array MOVIE_SOURCES.
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
  item: string;
  title: string;
  link: string;
  poster: string;
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
  countryDetail: (slug: string, page: number) => string;
  yearList: string;
  yearDetail: (year: string, page: number) => string;
  latest: (page: number) => string;
  popular: (page: number) => string;
}

export interface MovieSourceConfig {
  /** Nama unik source, dipakai sebagai identitas di field `source` pada response */
  name: string;
  baseURL: string;
  paths: MovieSourcePaths;
  /**
   * 'css'         -> scraping HTML statis pakai cheerio + `selectors` (mis. lk21).
   * 'natgeo-json' -> ekstrak blok JSON `window['__CONFIG__']` dari HTML, tidak
   *                  pakai `selectors` sama sekali (lihat parseNatGeoList/Detail).
   * Default (kalau tidak diisi): 'css'.
   */
  parserType?: 'css' | 'natgeo-json';
  /** Dipakai hanya kalau parserType === 'css'. */
  selectors?: MovieSourceSelectors;
  /**
   * Daftar section NatGeo yang dianggap sebagai "genre" (dipakai oleh
   * fetchGenreList & saat mencari section yang benar buat halaman detail).
   * Dipakai hanya kalau parserType === 'natgeo-json'.
   */
  natgeoSections?: { name: string; slug: string; path: string }[];
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

const NATGEO_SECTIONS: { name: string; slug: string; path: string }[] = [
  { name: 'Animals', slug: 'animals', path: '/animals' },
  { name: 'Science & Nature', slug: 'science', path: '/science' },
  { name: 'History & Culture', slug: 'history', path: '/history' },
  { name: 'Travel', slug: 'travel', path: '/travel' },
  { name: 'Health', slug: 'health', path: '/health' },
  { name: 'Environment', slug: 'environment', path: '/environment' },
];

/**
 * Source: National Geographic (nationalgeographic.com).
 * Ganti MOVIE_SOURCE_A_URL di .env kalau perlu (mis. buat regional domain).
 */
const sourceNatGeo: MovieSourceConfig = {
  name: getEnv('MOVIE_SOURCE_A_NAME', 'NatGeo'),
  baseURL: getEnv('MOVIE_SOURCE_A_URL', 'https://www.nationalgeographic.com'),
  parserType: 'natgeo-json',
  natgeoSections: NATGEO_SECTIONS,
  paths: {
    home: '/animals',
    // CATATAN: NatGeo pakai infinite-scroll berbasis token "context" (base64)
    // buat halaman ke-2 dst — bukan query string sederhana seperti
    // ?page=N. Mereplikasi token itu butuh reverse-engineering lebih jauh,
    // jadi UNTUK SEKARANG list() selalu mengembalikan halaman pertama
    // section utama berapapun `page` yang diminta (best-effort, bukan bug).
    list: () => '/animals',
    // Belum diverifikasi — NatGeo mungkin tidak expose pencarian lewat query
    // string biasa (perlu curl manual ke /search?q=... buat konfirmasi).
    search: (query) => `/search?q=${encodeURIComponent(query)}`,
    // `id` di sini adalah slug SATU segmen (mis. "french-wildfires-animals"),
    // bukan path lengkap — karena route Express /movies/:id cuma terima 1
    // segmen. Path ini sengaja tidak dipakai; fetchDetail (movieScraper.ts)
    // mencoba tiap section di natgeoSections sampai ketemu yang match,
    // karena artikel NatGeo tersebar di banyak section (/animals/article/x,
    // /science/article/y, dst) dan slug-nya saja tidak menunjukkan section.
    detail: (id) => `/animals/article/${id}`,
    genreList: '/animals',
    genreDetail: (slug) => NATGEO_SECTIONS.find((s) => s.slug === slug)?.path || `/${slug}`,
    // NatGeo tidak punya konsep "negara" untuk artikel -> tidak didukung,
    // fallback ke section utama supaya tidak crash.
    countryList: '/animals',
    countryDetail: () => '/animals',
    // NatGeo tidak punya listing per-tahun untuk artikel -> tidak didukung.
    yearList: '/animals',
    yearDetail: () => '/animals',
    latest: () => '/animals',
    popular: () => '/animals',
  },
};

export const MOVIE_SOURCES: MovieSourceConfig[] = [sourceNatGeo];

/**
 * Ambil daftar source yang aktif. Bisa dibatasi lewat env MOVIE_ACTIVE_SOURCES
 * (comma-separated nama source), misal: "NatGeo,SourceLainnya".
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
