import { Request, Response } from 'express';
import { animeV2Service } from '../services/animeV2.service';
import { parseSourceKey } from '../adapters/types';
import { sendSuccess } from '../utils/responseBuilder';

export async function getHomeController(req: Request, res: Response): Promise<void> {
  const result = await animeV2Service.getHome(parseSourceKey(req.query.source));
  sendSuccess(res, { message: 'Data berhasil diambil', source: result.source, data: result.data });
}
