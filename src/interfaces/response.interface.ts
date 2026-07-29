// Sebelumnya: export type SourceName = 'Otakudesu' | 'Samehadaku' | 'Gabungan';
// Dilebarkan jadi `string` supaya utils/responseBuilder.ts dan
// interfaces/errors.interface.ts (SourceError, AllSourcesFailedError) bisa
// dipakai ulang oleh module Movie, yang nama source-nya dinamis dari
// configs/movieSources.config.ts (bukan union literal tetap seperti Anime).
// Tidak ada perubahan perilaku untuk module Anime: 'Otakudesu', 'Samehadaku',
// dan 'Gabungan' tetap valid karena semuanya adalah string.
export type SourceName = string;

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
