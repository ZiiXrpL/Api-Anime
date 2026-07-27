import { Request, Response } from 'express';
import { animeService } from '../services/anime.service';
import { sendSuccess } from '../utils/responseBuilder';

export async function getHomeController(_req: Request, res: Response): Promise<void> {
  const result = await animeService.getHome();
  sendSuccess(res, { source: result.source, data: result.data });
}
