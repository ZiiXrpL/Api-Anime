import { Request, Response } from 'express';
import { movieService } from '../services/movie.service';
import { sendSuccess, sendError } from '../utils/responseBuilder';
import { parsePageQuery, validateSearchQuery, validateSlugParam } from '../schemas/movie.schema';

export async function getMovieListController(req: Request, res: Response): Promise<void> {
  const page = parsePageQuery(req.query.page);
  const result = await movieService.getList(page);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function getMoviePageController(req: Request, res: Response): Promise<void> {
  const page = parsePageQuery(req.params.number);
  const result = await movieService.getList(page);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function getMovieHomeController(_req: Request, res: Response): Promise<void> {
  const result = await movieService.getHome();
  sendSuccess(res, { source: result.source, data: result.data });
}

// Situs sumber tidak punya endpoint "latest"/"populer" terpisah dari
// listing utama (lihat komentar di movieScraper.fetchHome) — jadi kedua
// controller ini sengaja memakai sumber data yang sama (movieService.getList),
// bukan section yang dipalsukan.
export async function getMovieLatestController(req: Request, res: Response): Promise<void> {
  const page = parsePageQuery(req.query.page);
  const result = await movieService.getList(page);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function getMoviePopularController(req: Request, res: Response): Promise<void> {
  const page = parsePageQuery(req.query.page);
  const result = await movieService.getList(page);
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
  const { valid, slug, error } = validateSlugParam(req.params.slug, 'slug');
  if (!valid) {
    sendError(res, { message: error as string, statusCode: 400 });
    return;
  }
  const result = await movieService.getDetail(slug);
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getMovieWatchController(req: Request, res: Response): Promise<void> {
  const { valid, slug, error } = validateSlugParam(req.params.slug, 'slug');
  if (!valid) {
    sendError(res, { message: error as string, statusCode: 400 });
    return;
  }
  const result = await movieService.getWatch(slug);
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getMovieDownloadController(req: Request, res: Response): Promise<void> {
  const { valid, slug, error } = validateSlugParam(req.params.slug, 'slug');
  if (!valid) {
    sendError(res, { message: error as string, statusCode: 400 });
    return;
  }
  const result = await movieService.getDownload(slug);
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
