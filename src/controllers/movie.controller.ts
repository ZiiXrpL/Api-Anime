import { Request, Response } from 'express';
import { movieService } from '../services/movie.service';
import { sendSuccess, sendError } from '../utils/responseBuilder';
import {
  parseMovieListQuery,
  parsePageQuery,
  validateSearchQuery,
  validateSlugParam,
} from '../schemas/movie.schema';

export async function getMovieHomeController(_req: Request, res: Response): Promise<void> {
  const result = await movieService.getHome();
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getAllMoviesController(req: Request, res: Response): Promise<void> {
  const { page, genre, country, year } = parseMovieListQuery(req.query as Record<string, unknown>);
  const hasFilters = Boolean(genre || country || year);
  const result = await movieService.getAllMovies(page, hasFilters ? { genre, country, year } : undefined);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function searchMovieController(req: Request, res: Response): Promise<void> {
  const { valid, query, error } = validateSearchQuery(req.query.q);
  if (!valid) {
    sendError(res, { message: error as string, statusCode: 400 });
    return;
  }
  const result = await movieService.search(query);
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getMovieDetailController(req: Request, res: Response): Promise<void> {
  const { valid, slug: id, error } = validateSlugParam(req.params.id, 'id');
  if (!valid) {
    sendError(res, { message: error as string, statusCode: 400 });
    return;
  }
  const result = await movieService.getDetail(id);
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getMovieGenresController(_req: Request, res: Response): Promise<void> {
  const result = await movieService.getGenreList();
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getMoviesByGenreController(req: Request, res: Response): Promise<void> {
  const { valid, slug, error } = validateSlugParam(req.params.slug, 'slug');
  if (!valid) {
    sendError(res, { message: error as string, statusCode: 400 });
    return;
  }
  const page = parsePageQuery(req.query.page);
  const result = await movieService.getByGenre(slug, page);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function getMovieCountriesController(_req: Request, res: Response): Promise<void> {
  const result = await movieService.getCountryList();
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getMovieYearsController(_req: Request, res: Response): Promise<void> {
  const result = await movieService.getYearList();
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getMovieRecommendationController(_req: Request, res: Response): Promise<void> {
  const result = await movieService.getRecommendation();
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getLatestMoviesController(req: Request, res: Response): Promise<void> {
  const page = parsePageQuery(req.query.page);
  const result = await movieService.getLatest(page);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function getPopularMoviesController(req: Request, res: Response): Promise<void> {
  const page = parsePageQuery(req.query.page);
  const result = await movieService.getPopular(page);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}
