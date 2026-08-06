import { SourceName } from '../interfaces/response.interface';

// Sejak migrasi ke Kuramanime (sumber tunggal), logika fallback
// antar-sumber (withFallback) sudah tidak dipakai lagi -- dihapus supaya
// tidak ada kode mati yang membingungkan. Type SourceResult<T> tetap
// dipertahankan karena masih dipakai di seluruh anime.service.ts dan
// controller sebagai bentuk response standar { source, data }.
export interface SourceResult<T> {
  source: SourceName;
  data: T;
}
