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
 * secara hardcode — baseURL, path, dan selector/parser 100% berasal dari
 * config. Ini yang membuat scraper "modular": ganti/tambah source = ubah
 * configs/movieSources.config.ts saja.
 *
 * `source.parserType` menentukan jalur parsing: 'css' (default, cheerio +
 * selectors, mis. lk21) atau 'natgeo-json' (ekstrak blok JSON
 * window['__CONFIG__'], dipakai untuk nationalgeographic.com).
 */

function isNatGeoJson(source: MovieSourceConfig): boolean {
  return source.parserType === 'natgeo-json';
}

/**
 * DIAGNOSTIK (sementara): dipanggil kalau parseNatGeoHome/List balik kosong,
 * supaya kelihatan di Railway logs apa sebenarnya yang diterima server
 * (bukan browser HP) dari NatGeo — dugaan utama: NatGeo mendeteksi IP
 * datacenter Railway dan membalas halaman berbeda (blokir/interstitial/
 * halaman tanpa window['__CONFIG__']) dibanding saat diakses dari HP biasa.
 * Setelah penyebabnya jelas dari log, blok diagnostik ini bisa dicabut lagi.
 */
function logDiagnostic(source: MovieSourceConfig, html: string): void {
  const hasMarker = html.includes("window['__CONFIG__']=");
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  logger.warn(`${source.name}: hasil parse kosong — diagnostik HTML`, {
    htmlLength: html.length,
    hasConfigMarker: hasMarker,
    pageTitle: titleMatch ? titleMatch[1] : '(tidak ketemu tag <title>)',
    first500Chars: html.slice(0, 500),
  });
}

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
  if (isNatGeoJson(source)) {
    const result = MovieParser.parseNatGeoHome(html);
    if (result.latest.length === 0 && result.popular.length === 0) {
      logDiagnostic(source, html);
    }
    return result;
  }
  return MovieParser.parseHome(html, source);
}

export async function fetchList(
  source: MovieSourceConfig,
  page = 1,
  filters?: MovieListFilters,
): Promise<MovieCard[]> {
  const html = await fetchHtml(source, source.paths.list(page, filters));
  if (isNatGeoJson(source)) {
    const result = MovieParser.parseNatGeoList(html);
    if (result.length === 0) logDiagnostic(source, html);
    return result;
  }
  return MovieParser.parseMovieList(html, source);
}

export async function fetchSearch(source: MovieSourceConfig, query: string, page = 1): Promise<MovieCard[]> {
  if (isNatGeoJson(source)) {
    // NatGeo belum diverifikasi punya endpoint search yang bisa di-scrape
    // langsung (lihat catatan di paths.search, movieSources.config.ts) —
    // jadi untuk sekarang search NatGeo pakai strategi yang sama seperti
    // fallback lk21: cocokkan judul dari listing yang memang bisa diambil.
    return fetchSearchViaListing(source, query);
  }

  // FIX (masalah "search selalu gagal 403", khusus source berbasis CSS
  // seperti lk21): endpoint search.php di domain tersamar ternyata
  // dilindungi ketat oleh situs sumber (403 konsisten, bukan rate-limit
  // sementara). Solusinya: coba endpoint asli dulu, fallback ke pencarian
  // dari listing kalau gagal.
  try {
    const homeHtml = await fetchHtml(source, source.paths.home);
    const cfg = MovieParser.parseSearchConfig(homeHtml);
    if (!cfg) {
      throw new SourceError(source.name, 'data-search_url tidak ditemukan di homepage — situs mungkin ganti struktur lagi');
    }
    const searchApiUrl = cfg.searchUrl.replace(/\/$/, '') + '/search.php';
    const json = await getJson(searchApiUrl, { s: query, page });
    const results = MovieParser.parseSearchApiResponse(json, cfg.thumbnailUrl);
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

  const MAX_RESULTS = 20;
  const seenSlugs = new Set<string>();
  const results: MovieCard[] = [];

  // Untuk NatGeo: sisir tiap section (Animals, Science, dst) karena satu
  // halaman /latest gabungan tidak ada. Untuk source CSS biasa: sisir
  // beberapa halaman /latest seperti sebelumnya.
  const pagesToTry: (() => Promise<MovieCard[]>)[] = isNatGeoJson(source)
    ? (source.natgeoSections || []).map((section) => async () => {
        const html = await fetchHtml(source, section.path);
        return MovieParser.parseNatGeoList(html);
      })
    : Array.from({ length: 5 }, (_, i) => i + 1).map((page) => async () => {
        const html = await fetchHtml(source, source.paths.latest(page));
        return MovieParser.parseMovieList(html, source);
      });

  for (const getCards of pagesToTry) {
    let cards: MovieCard[];
    try {
      cards = await getCards();
    } catch {
      continue; // section/halaman ini gagal diambil -> lanjut ke berikutnya
    }

    if (cards.length === 0) continue;

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
  if (isNatGeoJson(source)) {
    // `id` cuma slug 1 segmen (mis. "french-wildfires-animals"), sedangkan
    // artikel NatGeo tersebar di banyak section (/animals/article/..,
    // /science/article/.., dst) dan slug-nya sendiri tidak menunjukkan
    // section mana. Jadi di sini kita coba tiap section yang dikenal
    // (natgeoSections) sampai ketemu artikel yang slug-nya cocok.
    const sections = source.natgeoSections || [];
    for (const section of sections) {
      let html: string;
      try {
        html = await fetchHtml(source, `${section.path}/article/${id}`);
      } catch {
        continue; // salah section / 404 -> coba section berikutnya
      }
      const detail = MovieParser.parseNatGeoDetail(html, id);
      if (detail) return detail;
    }
    throw new SourceError(source.name, `Artikel dengan id "${id}" tidak ditemukan di section manapun`);
  }

  const html = await fetchHtml(source, source.paths.detail(id));
  return MovieParser.parseMovieDetail(html, source, id);
}

export async function fetchGenreList(source: MovieSourceConfig): Promise<MovieGenreItem[]> {
  if (isNatGeoJson(source)) {
    // Untuk NatGeo, "genre" dipetakan dari daftar section statis
    // (natgeoSections di config) — bukan hasil scraping, karena section
    // NatGeo memang jarang berubah dan tidak ada halaman index taxonomy
    // seperti lk21.
    return (source.natgeoSections || []).map((s) => ({ name: s.name, slug: s.slug, url: s.path }));
  }
  const html = await fetchHtml(source, source.paths.genreList);
  return MovieParser.parseGenreList(html, source);
}

export async function fetchByGenre(source: MovieSourceConfig, slug: string, page = 1): Promise<MovieCard[]> {
  const html = await fetchHtml(source, source.paths.genreDetail(slug, page));
  if (isNatGeoJson(source)) return MovieParser.parseNatGeoList(html);
  return MovieParser.parseMovieList(html, source);
}

export async function fetchByCountry(source: MovieSourceConfig, slug: string, page = 1): Promise<MovieCard[]> {
  const html = await fetchHtml(source, source.paths.countryDetail(slug, page));
  if (isNatGeoJson(source)) return MovieParser.parseNatGeoList(html);
  return MovieParser.parseMovieList(html, source);
}

export async function fetchByYear(source: MovieSourceConfig, year: string, page = 1): Promise<MovieCard[]> {
  const html = await fetchHtml(source, source.paths.yearDetail(year, page));
  if (isNatGeoJson(source)) return MovieParser.parseNatGeoList(html);
  return MovieParser.parseMovieList(html, source);
}

export async function fetchCountryList(source: MovieSourceConfig): Promise<MovieCountryItem[]> {
  if (isNatGeoJson(source)) return []; // NatGeo tidak punya taxonomy negara untuk artikel
  const html = await fetchHtml(source, source.paths.countryList);
  return MovieParser.parseCountryList(html, source);
}

export async function fetchYearList(source: MovieSourceConfig): Promise<MovieYearItem[]> {
  if (isNatGeoJson(source)) return []; // NatGeo tidak punya taxonomy tahun untuk artikel
  const html = await fetchHtml(source, source.paths.yearList);
  return MovieParser.parseYearList(html, source);
}

export async function fetchLatest(source: MovieSourceConfig, page = 1): Promise<MovieCard[]> {
  const html = await fetchHtml(source, source.paths.latest(page));
  if (isNatGeoJson(source)) return MovieParser.parseNatGeoList(html);
  return MovieParser.parseMovieList(html, source);
}

export async function fetchPopular(source: MovieSourceConfig, page = 1): Promise<MovieCard[]> {
  const html = await fetchHtml(source, source.paths.popular(page));
  if (isNatGeoJson(source)) return MovieParser.parseNatGeoList(html);
  return MovieParser.parseMovieList(html, source);
}
