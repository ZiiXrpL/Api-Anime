import { NextFunction, Request, Response } from 'express';
import { AllSourcesFailedError, SourceError } from '../interfaces/errors.interface';
import { SourceName } from '../interfaces/response.interface';
import { sendError } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function globalErrorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, { message: err.message });

  if (err instanceof SourceError) {
    sendError(res, {
      message: err.message,
      source: err.source,
      statusCode: 502,
    });
    return;
  }

  if (err instanceof AllSourcesFailedError) {
    const lastSource = (err as unknown as { lastSource?: SourceName }).lastSource;
    sendError(res, {
      message: err.message,
      source: lastSource ?? 'None',
      statusCode: 503,
    });
    return;
  }

  sendError(res, {
    message: 'Terjadi kesalahan internal pada server',
    source: 'None',
    statusCode: 500,
  });
}
