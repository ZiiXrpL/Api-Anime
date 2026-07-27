import { Request, Response } from 'express';
import { animeService } from '../services/anime.service';
import { sendSuccess } from '../utils/responseBuilder';

function getPage(req: Request): number {
  const page = Number(req.query.page);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export async function getOngoingController(req: Request, res: Response): Promise<void> {
  const page = getPage(req);
  const result = await animeService.getOngoing(page);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function getCompletedController(req: Request, res: Response): Promise<void> {
  const page = getPage(req);
  const result = await animeService.getCompleted(page);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function getMoviesController(req: Request, res: Response): Promise<void> {
  const page = getPage(req);
  const result = await animeService.getMovies(page);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}
