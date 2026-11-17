import { Request, Response } from 'express';
import { animeV2Service } from '../services/animeV2.service';
import { parseSourceKey } from '../adapters/types';
import { sendSuccess, sendError } from '../utils/responseBuilder';

export async function searchController(req: Request, res: Response): Promise<void> {
  const query = String(req.query.q ?? '').trim();
  if (!query) {
    sendError(res, { message: 'Query parameter "q" wajib diisi', statusCode: 400 });
    return;
  }
  const result = await animeV2Service.search(query, parseSourceKey(req.query.source));
  sendSuccess(res, { source: result.source, total: result.data.length, data: result.data });
}
