/**
 * ============================================================================
 * MOVIE SOURCE CONFIG
 * ============================================================================
 * Source: nationalgeoraphic.com (tema WordPress MUVIPRO — dikonfirmasi dari
 * HTML mentah: list.html, list-page2.html, detail.html, genre-detail.html,
 * search.html, ajax-player.js, dan response asli player-p1/p2/p3.html).
 * Semua selector & path di bawah diambil LANGSUNG dari HTML tersebut, bukan
 * tebakan dari tema lain.
 *
 * File inilah SATU-SATUNYA tempat yang perlu diubah kalau situs sumber
 * berubah struktur HTML-nya. Parser (parsers/movie.parser.ts), scraper
 * (scrapers/movie/movieScraper.ts), service, controller, dan route TIDAK
 * PERNAH menyebut nama/struktur website secara hardcode.
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
  /** Selector container per-item kartu film (dipakai bareng di list/genre/search) */
  item: string;
  /** Selector <a> judul, relatif terhadap `item` (href = URL detail, text = judul) */
  titleLink: string;
  /** Selector <img> poster, relatif terhadap `item` */
  poster: string;
  posterAttr?: string;
  quality?: string;
  rating?: string;
  duration?: string;
  /** Selector <time itemprop="dateCreated"> (screen-reader-text) buat ambil tahun dari attr `datetime` */
  date?: string;
}

export interface MovieDetailSelectors {
  title: string;
  poster: string;
  posterAttr?: string;
  /** Paragraf sinopsis pertama di dalam .entry-content */
  synopsis: string;
  ratingValue?: string;
  /**
   * Baris metadata (Genre/Quality/Year/Country/Release/Language/Director/Cast)
   * ada di dalam <div class="gmr-moviedata"><strong>Label:</strong>...</div>
   * yang cuma dibedakan lewat teks label-nya, jadi diparse manual di
   * movie.parser.ts (bukan selector CSS per-field) — field di bawah cuma
   * container umumnya.
   */
  moviedataItem: string;
  genreItem: string;
  countryItem: string;
  directorItem: string;
  castItem: string;
  /** Container player: <div id="..." data-id="{post_id}"> */
  playerContainer: string;
  playerContainerIdAttr: string;
  /** Tab server: <li><a href="#p1">Server 1</a></li> */
  serverTabItem: string;
  downloadItem: string;
}

export interface MovieSourcePaths {
  /** Halaman list utama (dipetakan ke GET /movie, /movie/home, /movie/latest, /movie/popular) */
  list: (page: number) => string;
  search: (query: string) => string;
  detail: (slug: string) => string;
  genreDetail: (slug: string, page: number) => string;
  /** admin-ajax.php dipakai untuk resolve embed player (POST) */
  ajax: string;
}

export interface MovieSourceConfig {
  name: string;
  baseURL: string;
  /** Selector <li> menu "Genre" yang membungkus sub-menu genre (nav header) */
  genreMenuItem: string;
  paths: MovieSourcePaths;
  selectors: {
    list: MovieListSelectors;
    detail: MovieDetailSelectors;
  };
  /** Nilai `action` yang dikirim ke admin-ajax.php buat resolve embed player (dari ajax-player.js) */
  ajaxPlayerAction: string;
}

const nationalGeoraphic: MovieSourceConfig = {
  name: getEnv('MOVIE_SOURCE_A_NAME', 'NationalGeoraphic'),
  baseURL: getEnv('MOVIE_SOURCE_A_URL', 'https://nationalgeoraphic.com'),
  // Dropdown "Genre" di nav (<li id="menu-item-66">...<span>Genre</span>...)
  // adalah satu-satunya <li> menu top-level yang isi teksnya persis "Genre",
  // jadi diseleksi lewat XPath-like text match di parser (cheerio: iterasi
  // li.menu-item-has-children lalu cek teks anak <span> pertamanya).
  genreMenuItem: 'li.menu-item-has-children',
  paths: {
    list: (page) => (page > 1 ? `/category/movies/page/${page}/` : '/category/movies/'),
    // Dikonfirmasi dari search.html: /?s={query}&post_type[]=post&post_type[]=tv
    search: (query) => `/?s=${encodeURIComponent(query)}&post_type%5B%5D=post&post_type%5B%5D=tv`,
    // Detail film ada di root domain, bukan di bawah /movie/ atau /detail/
    // (contoh: https://nationalgeoraphic.com/all-that-we-never-were-2026/)
    detail: (slug) => `/${slug}/`,
    genreDetail: (slug, page) => (page > 1 ? `/category/${slug}/page/${page}/` : `/category/${slug}/`),
    ajax: '/wp-admin/admin-ajax.php',
  },
  selectors: {
    list: {
      item: 'article[id^="post-"]',
      titleLink: 'h2.entry-title a',
      poster: '.content-thumbnail img',
      posterAttr: 'src',
      quality: '.gmr-quality-item a',
      rating: '.gmr-rating-item',
      duration: '.gmr-duration-item',
      date: 'time[itemprop="dateCreated"]',
    },
    detail: {
      title: 'h1.entry-title',
      poster: '.gmr-movie-data figure img',
      posterAttr: 'src',
      synopsis: '.entry-content-single > p',
      ratingValue: '.gmr-meta-rating [itemprop="ratingValue"]',
      moviedataItem: '.content-moviedata .gmr-moviedata',
      genreItem: 'a[href*="/category/"]',
      countryItem: 'a[href*="/country/"]',
      directorItem: 'a[href*="/director/"]',
      castItem: 'a[href*="/cast/"]',
      playerContainer: '.muvipro_player_content',
      playerContainerIdAttr: 'data-id',
      serverTabItem: 'ul.muvipro-player-tabs > li > a',
      downloadItem: '#download .gmr-download-list a',
    },
  },
  // Dikonfirmasi dari ajax-player.js:
  // xhttp.send('action=muvipro_player_content&tab='+tab_name+'&post_id='+post_id)
  ajaxPlayerAction: 'muvipro_player_content',
};

export const MOVIE_SOURCES: MovieSourceConfig[] = [nationalGeoraphic];

/**
 * Ambil daftar source yang aktif. Bisa dibatasi lewat env MOVIE_ACTIVE_SOURCES
 * (comma-separated nama source). Kalau tidak diset, semua source dipakai.
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
  WATCH: getEnvNumber('MOVIE_CACHE_TTL_WATCH', 1800),
  TAXONOMY: getEnvNumber('MOVIE_CACHE_TTL_TAXONOMY', 21600),
};
