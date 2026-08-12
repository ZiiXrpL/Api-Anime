import { Request, Response } from 'express';
import { animeService } from '../services/anime.service';
import { sendSuccess } from '../utils/responseBuilder';

export async function getEpisodeController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await animeService.getEpisodeDetail(id as string);
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getStreamController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await animeService.getStreamServers(id as string);
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getDownloadController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await animeService.getDownloadLinks(id as string);
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getBatchController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await animeService.getBatchDownload(id as string);
  sendSuccess(res, { source: result.source, data: result.data });
}
