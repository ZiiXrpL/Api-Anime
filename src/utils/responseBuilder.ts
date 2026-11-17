import { Response } from 'express';
import { ApiErrorResponse, ApiSuccessResponse, Pagination, SourceName } from '../interfaces/response.interface';

export function sendSuccess<T>(
  res: Response,
  params: {
    message?: string;
    source: SourceName;
    data: T;
    total?: number;
    pagination?: Pagination;
    statusCode?: number;
  },
): Response {
  const body: ApiSuccessResponse<T> = {
    status: true,
    message: params.message ?? 'Success',
    source: params.source,
    data: params.data,
  };
  if (params.total !== undefined) {
    body.total = params.total;
  }
  if (params.pagination) {
    body.pagination = params.pagination;
  }
  return res.status(params.statusCode ?? 200).json(body);
}

export function sendError(
  res: Response,
  params: {
    message: string;
    source?: SourceName | 'None';
    statusCode?: number;
    code?: string;
  },
): Response {
  const body: ApiErrorResponse = {
    status: false,
    message: params.message,
    source: params.source ?? 'None',
  };
  if (params.code) {
    body.error = { code: params.code };
  }
  return res.status(params.statusCode ?? 502).json(body);
}
