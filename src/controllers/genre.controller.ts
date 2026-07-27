import { Request, Response } from 'express';
import { animeService } from '../services/anime.service';
import { sendSuccess, sendError } from '../utils/responseBuilder';

export async function getGenresController(_req: Request, res: Response): Promise<void> {
  const result = await animeService.getGenreList();
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getAnimeByGenreController(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  if (!slug) {
    sendError(res, { message: 'Parameter slug genre wajib diisi', statusCode: 400 });
    return;
  }
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const result = await animeService.getAnimeByGenre(slug, page);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}
