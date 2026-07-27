export interface AnimeCard {
  title: string;
  slug: string;
  poster: string;
  url: string;
  episode?: string;
  score?: string;
  status?: string;
  releaseDay?: string;
  type?: string;
}

export interface HomeData {
  ongoing: AnimeCard[];
  completed: AnimeCard[];
}

export interface GenreItem {
  name: string;
  slug: string;
  url: string;
}

export interface EpisodeItem {
  title: string;
  slug: string;
  url: string;
  releaseDate?: string;
}

export interface AnimeDetail {
  title: string;
  slug: string;
  poster: string;
  synopsis?: string;
  score?: string;
  status?: string;
  type?: string;
  releaseYear?: string;
  studio?: string;
  genres: GenreItem[];
  episodeList: EpisodeItem[];
}

export interface StreamServer {
  name: string;
  quality?: string;
  url: string;
}

export interface EpisodeDetail {
  title: string;
  slug: string;
  animeSlug?: string;
  streamServers: StreamServer[];
  downloadList: DownloadGroup[];
  navigation: {
    prevSlug?: string;
    nextSlug?: string;
    allEpisodeSlug?: string;
  };
}

export interface DownloadLink {
  provider: string;
  url: string;
}

export interface DownloadGroup {
  quality: string;
  format?: string;
  links: DownloadLink[];
}

export interface ScheduleItem {
  day: string;
  animeList: AnimeCard[];
}

export interface SearchResultItem extends AnimeCard {}
