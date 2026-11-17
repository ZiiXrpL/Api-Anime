import { Request, Response } from 'express';
import { animeV2Service } from '../services/animeV2.service';
import { parseSourceKey } from '../adapters/types';
import { sendSuccess } from '../utils/responseBuilder';

export async function getAllAnimeController(req: Request, res: Response): Promise<void> {
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const result = await animeV2Service.getAnimeList(page, parseSourceKey(req.query.source));
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function getAnimeDetailController(req: Request, res: Response): Promise<void> {
  const result = await animeV2Service.getAnimeDetail(String(req.params.id), parseSourceKey(req.query.source));
  sendSuccess(res, { source: result.source, data: result.data });
}
