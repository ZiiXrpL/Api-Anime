import { Request, Response } from 'express';
import { sendError } from '../utils/responseBuilder';

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, {
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`,
    source: 'None',
    statusCode: 404,
  });
}
