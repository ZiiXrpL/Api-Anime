import { Request, Response } from 'express';
import { animeV2Service } from '../services/animeV2.service';
import { getSourcesStatus } from '../services/sourceMonitor.service';
import { sendError, sendSuccess } from '../utils/responseBuilder';
import { parseSourceKey, SOURCE_KEYS, SourceKey } from '../adapters/types';

function sourceFrom(req: Request, res: Response): SourceKey | undefined {
  const raw = req.query.source;
  if (raw === undefined) return undefined;
  const key = parseSourceKey(raw);
  if (!key && !Array.isArray(raw)) {
    sendError(res, {
      message: `Source tidak dikenal. Pilihan: ${SOURCE_KEYS.join(', ')}`,
      statusCode: 400,
    });
    return undefined;
  }
  return key;
}

function pageFrom(req: Request): number {
  const page = Number(req.query.page);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export async function getSourcesController(req: Request, res: Response): Promise<void> {
  const force = String(req.query.refresh ?? '').toLowerCase() === 'true';
  const data = await getSourcesStatus(force);
  sendSuccess(res, { message: 'Status sumber anime (pemeriksaan aktual)', source: 'api', data });
}

export async function apiHomeController(req: Request, res: Response): Promise<void> {
  const source = sourceFrom(req, res);
  if (res.headersSent) return;
  const result = await animeV2Service.getHome(source);
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function apiOngoingController(req: Request, res: Response): Promise<void> {
  const source = sourceFrom(req, res);
  if (res.headersSent) return;
  const page = pageFrom(req);
  const result = await animeV2Service.getOngoing(page, source);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function apiCompletedController(req: Request, res: Response): Promise<void> {
  const source = sourceFrom(req, res);
  if (res.headersSent) return;
  const page = pageFrom(req);
  const result = await animeV2Service.getCompleted(page, source);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function apiListController(req: Request, res: Response): Promise<void> {
  const source = sourceFrom(req, res);
  if (res.headersSent) return;
  const page = pageFrom(req);
  const result = await animeV2Service.getAnimeList(page, source);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function apiSearchController(req: Request, res: Response): Promise<void> {
  const query = String(req.query.q ?? '').trim();
  if (!query) {
    sendError(res, { message: 'Query parameter "q" wajib diisi', statusCode: 400 });
    return;
  }
  const source = sourceFrom(req, res);
  if (res.headersSent) return;
  const result = await animeV2Service.search(query, source);
  sendSuccess(res, { source: result.source, total: result.data.length, data: result.data });
}

export async function apiDetailController(req: Request, res: Response): Promise<void> {
  const source = sourceFrom(req, res);
  if (res.headersSent) return;
  const result = await animeV2Service.getAnimeDetail(String(req.params.slug), source);
  if (!result.data || !result.data.title) {
    sendError(res, { message: 'Anime tidak ditemukan', source: result.source, statusCode: 404 });
    return;
  }
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function apiEpisodesController(req: Request, res: Response): Promise<void> {
  const source = sourceFrom(req, res);
  if (res.headersSent) return;
  const result = await animeV2Service.getEpisodes(String(req.params.slug), source);
  sendSuccess(res, { source: result.source, total: result.data.length, data: result.data });
}

export async function apiEpisodeController(req: Request, res: Response): Promise<void> {
  const source = sourceFrom(req, res);
  if (res.headersSent) return;
  const result = await animeV2Service.getEpisodeDetail(String(req.params.slug), source);
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function apiGenresController(req: Request, res: Response): Promise<void> {
  const source = sourceFrom(req, res);
  if (res.headersSent) return;
  const result = await animeV2Service.getGenres(source);
  sendSuccess(res, { source: result.source, total: result.data.length, data: result.data });
}

export async function apiScheduleController(req: Request, res: Response): Promise<void> {
  const source = sourceFrom(req, res);
  if (res.headersSent) return;
  const result = await animeV2Service.getSchedule(source);
  sendSuccess(res, { source: result.source, total: result.data.length, data: result.data });
}
