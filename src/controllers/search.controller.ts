import { Request, Response } from 'express';
import { animeService } from '../services/anime.service';
import { sendSuccess, sendError } from '../utils/responseBuilder';

export async function searchController(req: Request, res: Response): Promise<void> {
  const query = String(req.query.q ?? '').trim();
  if (!query) {
    sendError(res, { message: 'Query parameter "q" wajib diisi', statusCode: 400 });
    return;
  }
  const result = await animeService.search(query);
  sendSuccess(res, { source: result.source, data: result.data });
}
