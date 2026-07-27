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
