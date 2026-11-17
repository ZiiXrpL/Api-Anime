import { NextFunction, Request, Response } from 'express';
import {
  AllSourcesFailedError,
  ApiFailureError,
  DownloadUnavailableError,
  PlaybackUnavailableError,
  SourceError,
} from '../interfaces/errors.interface';
import { SourceName } from '../interfaces/response.interface';
import { sendError } from '../utils/responseBuilder';
import { logger } from '../utils/logger';
import { normalizeSourceName } from '../adapters/types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function globalErrorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, { message: err.message });

  if (res.headersSent) return;

  if (err instanceof ApiFailureError) {
    sendError(res, {
      message: err.message,
      source: normalizeSourceName(err.source),
      statusCode: err.statusCode,
      code: err.code,
    });
    return;
  }

  if (err instanceof PlaybackUnavailableError) {
    sendError(res, {
      message: err.message,
      source: normalizeSourceName(err.source),
      statusCode: 502,
      code: 'PLAYBACK_UNAVAILABLE',
    });
    return;
  }

  if (err instanceof DownloadUnavailableError) {
    sendError(res, {
      message: err.message,
      source: normalizeSourceName(err.source),
      statusCode: 502,
      code: 'DOWNLOAD_UNAVAILABLE',
    });
    return;
  }

  if (err instanceof SourceError) {
    sendError(res, {
      message: err.message,
      source: normalizeSourceName(err.source),
      statusCode: 502,
      code: 'SOURCE_UNAVAILABLE',
    });
    return;
  }

  if (err instanceof AllSourcesFailedError) {
    const lastSource = (err as unknown as { lastSource?: SourceName }).lastSource;
    sendError(res, {
      message: err.message,
      source: lastSource ? normalizeSourceName(lastSource) : 'none',
      statusCode: 503,
      code: 'ALL_SOURCES_FAILED',
    });
    return;
  }

  sendError(res, {
    message: 'Terjadi kesalahan internal pada server',
    source: 'none',
    statusCode: 500,
    code: 'INTERNAL_ERROR',
  });
}
