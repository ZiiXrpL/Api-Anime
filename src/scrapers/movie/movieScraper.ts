import { getMovieHttpClient } from '../../helpers/movieHttpClient';
import { MovieSourceConfig } from '../../configs/movieSources.config';
import { SourceError } from '../../interfaces/errors.interface';
import { MovieCard, MovieDetail, MovieGenreItem, MovieHomeData, MovieStreamServer } from '../../interfaces/movie.interface';
import * as MovieParser from '../../parsers/movie.parser';

/**
 * Semua fungsi di bawah menerima `source: MovieSourceConfig` sebagai
 * parameter pertama. Tidak ada satupun yang menyebut nama/struktur website
 * secara hardcode — baseURL, path, dan selector 100% berasal dari config.
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

export async function fetchList(source: MovieSourceConfig, page = 1): Promise<MovieCard[]> {
  const html = await fetchHtml(source, source.paths.list(page));
  return MovieParser.parseMovieCards(html, source);
}

/**
 * Situs sumber tidak punya widget "populer" terpisah dari listing utama —
 * cuma satu listing kronologis di /category/movies/ (lihat komentar di
 * MovieHomeData). Jadi `home` di sini mengembalikan data yang sama untuk
 * `latest` & `popular`, BUKAN section berbeda yang dipalsukan.
 */
export async function fetchHome(source: MovieSourceConfig): Promise<MovieHomeData> {
  const latest = await fetchList(source, 1);
  return { latest, popular: latest };
}

export async function fetchSearch(source: MovieSourceConfig, query: string): Promise<MovieCard[]> {
  const html = await fetchHtml(source, source.paths.search(query));
  return MovieParser.parseMovieCards(html, source);
}

export async function fetchGenreList(source: MovieSourceConfig): Promise<MovieGenreItem[]> {
  // Dropdown genre ada di nav header SETIAP halaman (termasuk homepage),
  // jadi cukup fetch halaman list utama, tidak perlu path/endpoint sendiri.
  const html = await fetchHtml(source, source.paths.list(1));
  return MovieParser.parseGenreList(html, source);
}

export async function fetchByGenre(source: MovieSourceConfig, slug: string, page = 1): Promise<MovieCard[]> {
  const html = await fetchHtml(source, source.paths.genreDetail(slug, page));
  return MovieParser.parseMovieCards(html, source);
}

interface DetailFetchResult {
  detail: MovieDetail;
  postId: string;
}

async function fetchDetailRaw(source: MovieSourceConfig, slug: string): Promise<DetailFetchResult> {
  const html = await fetchHtml(source, source.paths.detail(slug));
  return MovieParser.parseMovieDetail(html, source, slug);
}

export async function fetchDetail(source: MovieSourceConfig, slug: string): Promise<MovieDetail> {
  const { detail } = await fetchDetailRaw(source, slug);
  return detail;
}

export async function fetchDownload(source: MovieSourceConfig, slug: string): Promise<MovieDetail['downloadList']> {
  const { detail } = await fetchDetailRaw(source, slug);
  return detail.downloadList;
}

/**
 * Resolve semua server streaming sebuah film. Alurnya (dikonfirmasi dari
 * ajax-player.js + response player-p1/p2/p3.html):
 *  1. Fetch halaman detail buat dapat `post_id` (attr data-id) dan daftar
 *     tab server (mis. "p1" -> "Server 1").
 *  2. Untuk tiap tab, POST ke admin-ajax.php dengan body
 *     `action=muvipro_player_content&tab={tab}&post_id={post_id}`.
 *  3. Response-nya HTML fragment berisi <iframe src="...">, diambil lewat
 *     parseStreamEmbedUrl().
 * Mirip pola resolveOtakudesuStreamUrl (helpers/otakudesuStreamResolver.ts)
 * yang sudah ada buat module Anime — sama-sama butuh request AJAX tambahan
 * per server, bukan langsung tersedia di HTML pertama.
 */
export async function fetchWatch(
  source: MovieSourceConfig,
  slug: string,
): Promise<{ title: string; slug: string; servers: MovieStreamServer[] }> {
  const { detail, postId } = await fetchDetailRaw(source, slug);

  if (!postId || detail.servers.length === 0) {
    throw new SourceError(source.name, `Tidak ada server streaming ditemukan untuk "${slug}"`);
  }

  const client = getMovieHttpClient(source.baseURL);
  const servers: MovieStreamServer[] = [];

  for (const option of detail.servers) {
    try {
      const body = new URLSearchParams({
        action: source.ajaxPlayerAction,
        tab: option.tab,
        post_id: postId,
      }).toString();

      const { data } = await client.post<string>(source.paths.ajax, body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Referer: `${source.baseURL}${source.paths.detail(slug)}`,
        },
      });

      const embedUrl = MovieParser.parseStreamEmbedUrl(data);
      if (embedUrl) {
        servers.push({ name: option.name, url: embedUrl });
      }
    } catch {
      // Satu server gagal di-resolve tidak menggagalkan server lain —
      // sama seperti pola fallback di module ini secara umum.
    }
  }

  if (servers.length === 0) {
    throw new SourceError(source.name, `Semua server streaming gagal di-resolve untuk "${slug}"`);
  }

  return { title: detail.title, slug: detail.slug, servers };
}
