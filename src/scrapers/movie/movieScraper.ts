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
  // FIX (masalah "search film selalu kosong"): halaman /search situs ini
  // TIDAK berisi hasil apa pun di HTML-nya — hasil dimuat lewat AJAX oleh
  // JS halaman ke endpoint JSON search.php di domain terpisah (disamarkan),
  // yang alamatnya dibaca dari atribut data-search_url di <body> homepage.
  // Dibaca dinamis (bukan di-hardcode) supaya kalau situsnya ganti domain
  // penyamaran itu lagi nanti, kode ini tetap otomatis ikut.
  const homeHtml = await fetchHtml(source, source.paths.home);
  const cfg = MovieParser.parseSearchConfig(homeHtml);

  if (!cfg) {
    throw new SourceError(source.name, 'data-search_url tidak ditemukan di homepage — situs mungkin ganti struktur lagi');
  }

  const searchApiUrl = cfg.searchUrl.replace(/\/$/, '') + '/search.php';
  const json = await getJson(searchApiUrl, { s: query, page });

  return MovieParser.parseSearchApiResponse(json, cfg.thumbnailUrl);
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
