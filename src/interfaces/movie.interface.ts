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

export interface MovieHomeData {
  latest: MovieCard[];
  popular: MovieCard[];
}

export interface MovieGenreItem {
  name: string;
  slug: string;
  url: string;
}

export interface MovieCountryItem {
  name: string;
  slug: string;
  url: string;
}

export interface MovieYearItem {
  year: string;
  url: string;
}

export interface MovieStreamServer {
  name: string;
  quality?: string;
  url: string;
}

export interface MovieDownloadLink {
  provider: string;
  url: string;
}

export interface MovieDownloadGroup {
  quality: string;
  format?: string;
  links: MovieDownloadLink[];
}

export interface MovieDetail {
  title: string;
  slug: string;
  poster: string;
  synopsis?: string;
  rating?: string;
  quality?: string;
  duration?: string;
  releaseYear?: string;
  country?: string;
  director?: string;
  cast: string[];
  genres: MovieGenreItem[];
  streamServers: MovieStreamServer[];
  downloadList: MovieDownloadGroup[];
}

/**
 * Filter opsional yang bisa dipakai saat mengambil daftar film utama (GET /movies).
 * Dipakai bersama endpoint list untuk memberi nilai tambah pada
 * GET /movies/country dan GET /movies/year tanpa menambah route baru
 * di luar yang diminta.
 */
export interface MovieListFilters {
  genre?: string;
  country?: string;
  year?: string;
}
