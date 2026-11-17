import { SourceName } from './response.interface';

export class SourceError extends Error {
  public source: SourceName;

  constructor(source: SourceName, message: string) {
    super(message);
    this.name = 'SourceError';
    this.source = source;
  }
}

export class AllSourcesFailedError extends Error {
  constructor(message = 'Semua source tidak tersedia') {
    super(message);
    this.name = 'AllSourcesFailedError';
  }
}

/** Kegagalan dengan kode error dan HTTP status yang sudah ditentukan. */
export class ApiFailureError extends Error {
  public code: string;
  public statusCode: number;
  public source: string;

  constructor(message: string, code: string, statusCode: number, source: string) {
    super(message);
    this.name = 'ApiFailureError';
    this.code = code;
    this.statusCode = statusCode;
    this.source = source;
  }
}

export class PlaybackUnavailableError extends Error {
  public source: string;

  constructor(source: string, message: string) {
    super(message);
    this.name = 'PlaybackUnavailableError';
    this.source = source;
  }
}

export class DownloadUnavailableError extends Error {
  public source: string;

  constructor(source: string, message: string) {
    super(message);
    this.name = 'DownloadUnavailableError';
    this.source = source;
  }
}
