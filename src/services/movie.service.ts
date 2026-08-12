import { cacheManager } from '../helpers/cacheManager';
import { MOVIE_CACHE_TTL } from '../configs/movieSources.config';
import { withMovieFallback, MovieSourceResult } from './movieSourceManager.service';
import * as MovieScraper from '../scrapers/movie/movieScraper';
import { MovieCard, MovieDetail, MovieDownloadLink, MovieGenreItem, MovieHomeData, MovieWatchData } from '../interfaces/movie.interface';

export const movieService = {
  getList(page: number): Promise<MovieSourceResult<MovieCard[]>> {
    return cacheManager.wrap(`movie:list:${page}`, MOVIE_CACHE_TTL.LIST, () =>
      withMovieFallback((source) => MovieScraper.fetchList(source, page)),
    );
  },

  getHome(): Promise<MovieSourceResult<MovieHomeData>> {
    return cacheManager.wrap('movie:home', MOVIE_CACHE_TTL.HOME, () =>
      withMovieFallback((source) => MovieScraper.fetchHome(source)),
    );
  },

  search(query: string): Promise<MovieSourceResult<MovieCard[]>> {
    return cacheManager.wrap(`movie:search:${query}`, MOVIE_CACHE_TTL.LIST, () =>
      withMovieFallback((source) => MovieScraper.fetchSearch(source, query)),
    );
  },

  getDetail(slug: string): Promise<MovieSourceResult<MovieDetail>> {
    return cacheManager.wrap(`movie:detail:${slug}`, MOVIE_CACHE_TTL.DETAIL, () =>
      withMovieFallback((source) => MovieScraper.fetchDetail(source, slug)),
    );
  },

  getWatch(slug: string): Promise<MovieSourceResult<MovieWatchData>> {
    return cacheManager.wrap(`movie:watch:${slug}`, MOVIE_CACHE_TTL.WATCH, () =>
      withMovieFallback((source) => MovieScraper.fetchWatch(source, slug)),
    );
  },

  getDownload(slug: string): Promise<MovieSourceResult<MovieDownloadLink[]>> {
    return cacheManager.wrap(`movie:download:${slug}`, MOVIE_CACHE_TTL.DETAIL, () =>
      withMovieFallback((source) => MovieScraper.fetchDownload(source, slug)),
    );
  },

  getGenreList(): Promise<MovieSourceResult<MovieGenreItem[]>> {
    return cacheManager.wrap('movie:genres', MOVIE_CACHE_TTL.TAXONOMY, () =>
      withMovieFallback((source) => MovieScraper.fetchGenreList(source)),
    );
  },

  getByGenre(slug: string, page: number): Promise<MovieSourceResult<MovieCard[]>> {
    return cacheManager.wrap(`movie:genre:${slug}:${page}`, MOVIE_CACHE_TTL.LIST, () =>
      withMovieFallback((source) => MovieScraper.fetchByGenre(source, slug, page)),
    );
  },
};
