import {
  AnimeCard,
  AnimeDetail,
  EpisodeDetail,
  GenreItem,
  HomeData,
  ScheduleItem,
} from '../interfaces/anime.interface';

/** Kunci sumber yang dipakai di query `?source=` dan field `source`. */
export type SourceKey = 'otakudesu' | 'nimegami' | 'kuramanime' | 'samehadaku';

export const SOURCE_KEYS: SourceKey[] = ['otakudesu', 'nimegami', 'kuramanime', 'samehadaku'];

/** Nama tampilan bersejarah (dipakai internal) -> kunci kanonik. */
const ALIASES: Record<string, SourceKey> = {
  otakudesu: 'otakudesu', otaku: 'otakudesu',
  nimegami: 'nimegami', nime: 'nimegami',
  kuramanime: 'kuramanime', kurama: 'kuramanime',
  samehadaku: 'samehadaku', same: 'samehadaku',
};

export function parseSourceKey(value: unknown): SourceKey | undefined {
  if (typeof value !== 'string') return undefined;
  return ALIASES[value.trim().toLowerCase()];
}

/** Fungsi yang benar-benar didukung tiap adapter (tanpa data palsu). */
export interface SourceCapabilities {
  home: boolean;
  ongoing: boolean;
  completed: boolean;
  list: boolean;
  search: boolean;
  detail: boolean;
  episodes: boolean;
  episodeDetail: boolean;
  genres: boolean;
  schedule: boolean;
}

/** Kontrak data internal yang konsisten untuk semua sumber. */
export interface AnimeAdapter {
  key: SourceKey;
  displayName: string;
  baseUrl: string;
  capabilities: SourceCapabilities;
  getHome(): Promise<HomeData>;
  getOngoing(page: number): Promise<AnimeCard[]>;
  getCompleted(page: number): Promise<AnimeCard[]>;
  getAnimeList(page: number): Promise<AnimeCard[]>;
  searchAnime(query: string): Promise<AnimeCard[]>;
  getAnimeDetail(slug: string): Promise<AnimeDetail>;
  getEpisodes(slug: string): Promise<AnimeCard[]>;
  getEpisodeDetail(slug: string): Promise<EpisodeDetail>;
  getGenres(): Promise<GenreItem[]>;
  getSchedule(): Promise<ScheduleItem[]>;
}

export function normalizeSourceName(name: string): string {
  const key = parseSourceKey(name);
  if (key) return key;
  const lower = name.trim().toLowerCase();
  if (lower === 'gabungan' || lower === 'combined') return 'combined';
  return lower || 'none';
}
