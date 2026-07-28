export type SourceName = 'Otakudesu' | 'Samehadaku' | 'Gabungan';

export interface Pagination {
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalPage?: number;
}

export interface ApiSuccessResponse<T> {
  status: true;
  message: string;
  source: SourceName;
  data: T;
  pagination?: Pagination;
}

export interface ApiErrorResponse {
  status: false;
  message: string;
  source?: SourceName | 'None';
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
