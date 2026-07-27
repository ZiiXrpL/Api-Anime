import { Request, Response } from 'express';
import { animeService } from '../services/anime.service';
import { sendSuccess } from '../utils/responseBuilder';

export async function getRecommendationController(_req: Request, res: Response): Promise<void> {
  const result = await animeService.getRecommendation();
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getRandomController(_req: Request, res: Response): Promise<void> {
  const result = await animeService.getRandom();
  sendSuccess(res, { source: result.source, data: result.data });
}
