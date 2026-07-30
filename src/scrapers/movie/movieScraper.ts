import { getMovieHttpClient, getJson } from '../../helpers/movieHttpClient';
import { MovieSourceConfig } from '../../configs/movieSources.config';
import { SourceError } from '../../interfaces/errors.interface';
import {
  MovieCard,
  MovieCountryItem,
  MovieDetail,
  MovieGenreItem,
  MovieHomeData,
  MovieListFilters,
  MovieYearItem,
} from '../../interfaces/movie.interface';
import * as MovieParser from '../../parsers/movie.parser';
import { logger } from '../../utils/logger';

/**
 * Semua fungsi di bawah menerima `source: MovieSourceConfig` sebagai
 * parameter pertama. Tidak ada satupun yang menyebut nama/struktur website
 * secara hardcode — baseURL, path, dan selector 100% berasal dari config.
 * Ini yang membuat scraper "modular": ganti/tambah source = ubah
 * configs/movieSources.config.ts saja.
 */

async function fetchHtml(source: MovieSourceConfig, path: string): Promise<string> {
  try {
    const client = getMovieHttpClient(source.baseURL);
    const { data } = await client.get<string>(path);
    return data;
  } catch (error) {
    throw new SourceError(source.name, `Gagal mengambil ${path}: ${(error as Error).message}`);
  }
}

export async function fetchHome(source: MovieSourceConfig): Promise<MovieHomeData> {
  const html = await fetchHtml(source, source.paths.home);
  return MovieParser.parseHome(html, source);
}

export async function fetchList(
  source: MovieSourceConfig,
  page = 1,
  filters?: MovieListFilters,
): Promise<MovieCard[]> {
  const html = await fetchHtml(source, source.paths.list(page, filters));
  return MovieParser.parseMovieList(html, source);
}

export async function fetchSearch(source: MovieSourceConfig, query: string, page = 1): Promise<MovieCard[]> {
  // FIX (masalah "search selalu gagal 403"): endpoint search.php di domain
  // tersamar ternyata dilindungi ketat oleh situs sumber (403 konsisten,
  // bukan rate-limit sementara — sudah dites berkali-kali beda waktu, beda
  // kata kunci, tetap 403). Ini proteksi yang disengaja, bukan bug di kode
  // kita, dan menembusnya "beneran" butuh headless browser (berat, belum
  // tentu berhasil juga karena Cloudflare bisa mendeteksi itu juga).
  //
  // Solusi yang dipakai: coba endpoint asli dulu; kalau gagal, fallback ke
  // "pencarian dari listing" — ambil beberapa halaman /latest yang memang
  // TIDAK diblokir, lalu cocokkan judulnya sendiri di sini. Konsekuensi yang
  // disadari: cakupannya cuma sebatas film-film di halaman terbaru (bukan
  // seluruh katalog situs), tapi ini jauh lebih baik daripada selalu gagal
  // total, dan tidak butuh infrastruktur tambahan yang berat.
  try {
    const homeHtml = await fetchHtml(source, source.paths.home);
    const cfg = MovieParser.parseSearchConfig(homeHtml);
    if (!cfg) {
      throw new SourceError(source.name, 'data-search_url tidak ditemukan di homepage — situs mungkin ganti struktur lagi');
    }
    const searchApiUrl = cfg.searchUrl.replace(/\/$/, '') + '/search.php';
    const json = await getJson(searchApiUrl, { s: query, page });
    const results = MovieParser.parseSearchApiResponse(json, cfg.thumbnailUrl);
    if (results.length > 0) return results;
    // API-nya sukses tapi kosong beneran (bukan diblokir) -> percaya itu,
    // jangan lanjut fallback supaya tidak menampilkan hasil yang salah.
    return results;
  } catch (apiError) {
    logger.warn(
      `${source.name}: search API gagal (${(apiError as Error).message}), fallback ke pencarian dari listing terbaru`,
    );
    return fetchSearchViaListing(source, query);
  }
}

async function fetchSearchViaListing(source: MovieSourceConfig, query: string): Promise<MovieCard[]> {
  const q = query.trim().toLowerCase();
  if (q === '') return [];

  const MAX_PAGES = 5;
  const MAX_RESULTS = 20;
  const seenSlugs = new Set<string>();
  const results: MovieCard[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    let cards: MovieCard[];
    try {
      const html = await fetchHtml(source, source.paths.latest(page));
      cards = MovieParser.parseMovieList(html, source);
    } catch {
      break; // halaman ini gagal diambil -> hentikan, kembalikan yang sudah ketemu
    }

    if (cards.length === 0) break; // sudah habis halamannya

    for (const card of cards) {
      if (!seenSlugs.has(card.slug) && card.title.toLowerCase().includes(q)) {
        seenSlugs.add(card.slug);
        results.push(card);
      }
    }

    if (results.length >= MAX_RESULTS) break;
  }

  return results;
}

export async function fetchDetail(source: MovieSourceConfig, id: string): Promise<MovieDetail> {
  const html = await fetchHtml(source, source.paths.detail(id));
  return MovieParser.parseMovieDetail(html, source, id);
}

export async function fetchGenreList(source: MovieSourceConfig): Promise<MovieGenreItem[]> {
  const html = await fetchHtml(source, source.paths.genreList);
  return MovieParser.parseGenreList(html, source);
}

export async function fetchByGenre(source: MovieSourceConfig, slug: string, page = 1): Promise<MovieCard[]> {
  const html = await fetchHtml(source, source.paths.genreDetail(slug, page));
  return MovieParser.parseMovieList(html, source);
}

export async function fetchByCountry(source: MovieSourceConfig, slug: string, page = 1): Promise<MovieCard[]> {
  const html = await fetchHtml(source, source.paths.countryDetail(slug, page));
  return MovieParser.parseMovieList(html, source);
}

export async function fetchByYear(source: MovieSourceConfig, year: string, page = 1): Promise<MovieCard[]> {
  const html = await fetchHtml(source, source.paths.yearDetail(year, page));
  return MovieParser.parseMovieList(html, source);
}

export async function fetchCountryList(source: MovieSourceConfig): Promise<MovieCountryItem[]> {
  const html = await fetchHtml(source, source.paths.countryList);
  return MovieParser.parseCountryList(html, source);
}

export async function fetchYearList(source: MovieSourceConfig): Promise<MovieYearItem[]> {
  const html = await fetchHtml(source, source.paths.yearList);
  return MovieParser.parseYearList(html, source);
}

export async function fetchLatest(source: MovieSourceConfig, page = 1): Promise<MovieCard[]> {
  const html = await fetchHtml(source, source.paths.latest(page));
  return MovieParser.parseMovieList(html, source);
}

export async function fetchPopular(source: MovieSourceConfig, page = 1): Promise<MovieCard[]> {
  const html = await fetchHtml(source, source.paths.popular(page));
  return MovieParser.parseMovieList(html, source);
}
