import { Request, Response } from 'express';
import { animeV2Service } from '../services/animeV2.service';
import { parseSourceKey } from '../adapters/types';
import { sendSuccess } from '../utils/responseBuilder';

function getPage(req: Request): number {
  const page = Number(req.query.page);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export async function getOngoingController(req: Request, res: Response): Promise<void> {
  const page = getPage(req);
  const result = await animeV2Service.getOngoing(page, parseSourceKey(req.query.source));
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function getCompletedController(req: Request, res: Response): Promise<void> {
  const page = getPage(req);
  const result = await animeV2Service.getCompleted(page, parseSourceKey(req.query.source));
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

// Endpoint anime movie lama: tetap memakai layanan lama untuk kompatibilitas.
export { getMoviesController } from './legacyMovies.controller';
