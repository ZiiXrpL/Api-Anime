import { cacheManager } from '../helpers/cacheManager';
import { MOVIE_CACHE_TTL } from '../configs/movieSources.config';
import { withMovieFallback, MovieSourceResult } from './movieSourceManager.service';
import * as MovieScraper from '../scrapers/movie/movieScraper';
import {
  MovieCard,
  MovieCountryItem,
  MovieDetail,
  MovieGenreItem,
  MovieHomeData,
  MovieListFilters,
  MovieYearItem,
} from '../interfaces/movie.interface';

export const movieService = {
  getHome(): Promise<MovieSourceResult<MovieHomeData>> {
    return cacheManager.wrap('movie:home', MOVIE_CACHE_TTL.HOME, () =>
      withMovieFallback((source) => MovieScraper.fetchHome(source)),
    );
  },

  getAllMovies(page: number, filters?: MovieListFilters): Promise<MovieSourceResult<MovieCard[]>> {
    const filterKey = filters ? JSON.stringify(filters) : 'none';
    return cacheManager.wrap(`movie:list:${page}:${filterKey}`, MOVIE_CACHE_TTL.LIST, () =>
      withMovieFallback((source) => MovieScraper.fetchList(source, page, filters)),
    );
  },

  search(query: string): Promise<MovieSourceResult<MovieCard[]>> {
    return cacheManager.wrap(`movie:search:${query}`, MOVIE_CACHE_TTL.LIST, () =>
      withMovieFallback((source) => MovieScraper.fetchSearch(source, query)),
    );
  },

  getDetail(id: string): Promise<MovieSourceResult<MovieDetail>> {
    return cacheManager.wrap(`movie:detail:${id}`, MOVIE_CACHE_TTL.DETAIL, () =>
      withMovieFallback((source) => MovieScraper.fetchDetail(source, id)),
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

  getCountryList(): Promise<MovieSourceResult<MovieCountryItem[]>> {
    return cacheManager.wrap('movie:countries', MOVIE_CACHE_TTL.TAXONOMY, () =>
      withMovieFallback((source) => MovieScraper.fetchCountryList(source)),
    );
  },

  getYearList(): Promise<MovieSourceResult<MovieYearItem[]>> {
    return cacheManager.wrap('movie:years', MOVIE_CACHE_TTL.TAXONOMY, () =>
      withMovieFallback((source) => MovieScraper.fetchYearList(source)),
    );
  },

  getLatest(page: number): Promise<MovieSourceResult<MovieCard[]>> {
    return cacheManager.wrap(`movie:latest:${page}`, MOVIE_CACHE_TTL.LIST, () =>
      withMovieFallback((source) => MovieScraper.fetchLatest(source, page)),
    );
  },

  getPopular(page: number): Promise<MovieSourceResult<MovieCard[]>> {
    return cacheManager.wrap(`movie:popular:${page}`, MOVIE_CACHE_TTL.LIST, () =>
      withMovieFallback((source) => MovieScraper.fetchPopular(source, page)),
    );
  },

  async getRecommendation(): Promise<MovieSourceResult<MovieCard[]>> {
    return cacheManager.wrap('movie:recommendation', MOVIE_CACHE_TTL.HOME, async () => {
      const result = await withMovieFallback((source) => MovieScraper.fetchHome(source));
      const pool = [...result.data.latest, ...result.data.popular];
      const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 10);
      return { source: result.source, data: shuffled };
    });
  },
};
