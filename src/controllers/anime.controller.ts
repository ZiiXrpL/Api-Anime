import { Request, Response } from 'express';
import { animeService } from '../services/anime.service';
import { sendSuccess } from '../utils/responseBuilder';

export async function getAllAnimeController(req: Request, res: Response): Promise<void> {
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const result = await animeService.getAllAnime(page);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function getAnimeDetailController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await animeService.getAnimeDetail(id as string);
  sendSuccess(res, { source: result.source, data: result.data });
}
