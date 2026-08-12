export interface MovieCard {
  title: string;
  slug: string;
  poster: string;
  url: string;
  quality?: string;
  rating?: string;
  year?: string;
  duration?: string;
  type?: string;
}

/**
 * Situs sumber (tema MUVIPRO) tidak punya widget "populer" terpisah dari
 * "terbaru" di halaman utamanya — cuma satu listing kronologis di
 * /category/movies/. Jadi `popular` di sini adalah data yang sama dengan
 * `latest` (bukan hasil scraping section berbeda). Ini didokumentasikan di
 * movieScraper.ts, bukan ditebak/dipalsukan sebagai section terpisah.
 */
export interface MovieHomeData {
  latest: MovieCard[];
  popular: MovieCard[];
}

export interface MovieGenreItem {
  name: string;
  slug: string;
  url: string;
}

/**
 * Nama server (mis. "Server 1") yang tersedia untuk sebuah film, TANPA
 * meng-resolve URL embed-nya. Dipakai di MovieDetail supaya GET
 * /movie/detail/:slug tetap ringan (1 request) — resolve embed url per
 * server (butuh request AJAX tambahan per server) baru dilakukan di
 * GET /movie/watch/:slug.
 */
export interface MovieServerOption {
  name: string;
  tab: string;
}

/** Server yang URL embed-nya sudah di-resolve (dipakai di GET /movie/watch/:slug). */
export interface MovieStreamServer {
  name: string;
  url: string;
}

export interface MovieDownloadLink {
  provider: string;
  url: string;
}

export interface MovieDetail {
  title: string;
  slug: string;
  poster: string;
  synopsis?: string;
  rating?: string;
  quality?: string;
  releaseYear?: string;
  country?: string;
  language?: string;
  director?: string;
  cast: string[];
  genres: MovieGenreItem[];
  servers: MovieServerOption[];
  downloadList: MovieDownloadLink[];
}

export interface MovieWatchData {
  title: string;
  slug: string;
  servers: MovieStreamServer[];
}
