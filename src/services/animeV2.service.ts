import { adapters, DEFAULT_FALLBACK_ORDER } from '../adapters/registry';
import { AnimeAdapter, SourceKey, parseSourceKey } from '../adapters/types';
import {
  AnimeCard,
  AnimeDetail,
  EpisodeDetail,
  GenreItem,
  HomeData,
  ScheduleItem,
} from '../interfaces/anime.interface';
import { AllSourcesFailedError } from '../interfaces/errors.interface';
import { cacheManager } from '../helpers/cacheManager';
import { CACHE_TTL } from '../configs/cache';
import { logger } from '../utils/logger';

export interface SourceResultV2<T> {
  source: SourceKey;
  data: T;
}

type Fetcher<T> = (adapter: AnimeAdapter) => Promise<T>;
type Step<T> = { key: SourceKey; run: Fetcher<T> };

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('title' in record && !record.title) return true;
    const vals = Object.values(record);
    if (vals.length === 0) return true;
    if (vals.every((v) => Array.isArray(v) && v.length === 0)) return true;
  }
  return false;
}

/**
 * Jalankan fetcher dengan urutan fallback terkontrol.
 * - Tanpa `?source=`: DEFAULT_FALLBACK_ORDER.
 * - Dengan `?source=`: sumber itu didahulukan; jika gagal, fallback ke sumber
 *   lain yang mendukung endpoint, dan source aktual tetap dilaporkan.
 */
async function run<T>(
  capability: keyof AnimeAdapter['capabilities'],
  fetcher: Fetcher<T>,
  requested?: SourceKey,
  skipEmpty = true,
): Promise<SourceResultV2<T>> {
  const preferred = requested ? [requested, ...DEFAULT_FALLBACK_ORDER.filter((k) => k !== requested)] : DEFAULT_FALLBACK_ORDER;
  const steps: Step<T>[] = preferred
    .filter((key) => adapters[key].capabilities[capability])
    .map((key) => ({ key, run: (adapter: AnimeAdapter) => fetcher(adapter) }));

  if (steps.length === 0) {
    throw new AllSourcesFailedError(`Tidak ada sumber yang mendukung ${capability}`);
  }

  const failures: string[] = [];
  for (const step of steps) {
    try {
      const data = await step.run(adapters[step.key]);
      if (skipEmpty && isEmpty(data)) {
        failures.push(`${step.key}: kosong`);
        continue;
      }
      return { source: step.key, data };
    } catch (error) {
      failures.push(`${step.key}: ${(error as Error).message}`);
      logger.warn(`[animeV2] ${step.key}.${capability} gagal: ${(error as Error).message}`);
    }
  }
  const err = new AllSourcesFailedError(`Semua sumber gagal untuk ${capability} (${failures.join('; ')})`);
  (err as unknown as { lastSource: string }).lastSource = requested ?? DEFAULT_FALLBACK_ORDER[0];
  throw err;
}

/** Dedupe kartu dari satu sumber (berdasarkan slug), tanpa menggabung sumber. */
function dedupe(cards: AnimeCard[]): AnimeCard[] {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = `${card.slug}::${card.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const animeV2Service = {
  parseSource: parseSourceKey,

  getHome(source?: SourceKey): Promise<SourceResultV2<HomeData>> {
    return cacheManager.wrap(`v2:home:${source ?? 'auto'}`, CACHE_TTL.HOME, async () => {
      const result = await run<HomeData>('home', (a) => a.getHome(), source, false);
      return { source: result.source, data: { ongoing: dedupe(result.data.ongoing), completed: dedupe(result.data.completed) } };
    });
  },

  getOngoing(page: number, source?: SourceKey): Promise<SourceResultV2<AnimeCard[]>> {
    return cacheManager.wrap(`v2:ongoing:${page}:${source ?? 'auto'}`, CACHE_TTL.LIST, async () => {
      const result = await run<AnimeCard[]>('ongoing', (a) => a.getOngoing(page), source);
      return { source: result.source, data: dedupe(result.data) };
    });
  },

  getCompleted(page: number, source?: SourceKey): Promise<SourceResultV2<AnimeCard[]>> {
    return cacheManager.wrap(`v2:completed:${page}:${source ?? 'auto'}`, CACHE_TTL.LIST, async () => {
      const result = await run<AnimeCard[]>('completed', (a) => a.getCompleted(page), source);
      return { source: result.source, data: dedupe(result.data) };
    });
  },

  getAnimeList(page: number, source?: SourceKey): Promise<SourceResultV2<AnimeCard[]>> {
    return cacheManager.wrap(`v2:list:${page}:${source ?? 'auto'}`, CACHE_TTL.LIST, async () => {
      const result = await run<AnimeCard[]>('list', (a) => a.getAnimeList(page), source);
      return { source: result.source, data: dedupe(result.data) };
    });
  },

  search(query: string, source?: SourceKey): Promise<SourceResultV2<AnimeCard[]>> {
    return cacheManager.wrap(`v2:search:${query}:${source ?? 'auto'}`, CACHE_TTL.LIST, async () => {
      const result = await run<AnimeCard[]>('search', (a) => a.searchAnime(query), source);
      return { source: result.source, data: dedupe(result.data) };
    });
  },

  getAnimeDetail(slug: string, source?: SourceKey): Promise<SourceResultV2<AnimeDetail>> {
    return cacheManager.wrap(`v2:detail:${source ?? 'auto'}:${slug}`, CACHE_TTL.DETAIL, () =>
      run<AnimeDetail>('detail', (a) => a.getAnimeDetail(slug), source),
    );
  },

  getEpisodes(slug: string, source?: SourceKey): Promise<SourceResultV2<AnimeCard[]>> {
    return cacheManager.wrap(`v2:episodes:${source ?? 'auto'}:${slug}`, CACHE_TTL.DETAIL, async () => {
      const result = await run<AnimeCard[]>('episodes', (a) => a.getEpisodes(slug), source);
      return { source: result.source, data: dedupe(result.data) };
    });
  },

  getEpisodeDetail(slug: string, source?: SourceKey): Promise<SourceResultV2<EpisodeDetail>> {
    return cacheManager.wrap(`v2:episode:${source ?? 'auto'}:${slug}`, CACHE_TTL.EPISODE, () =>
      run<EpisodeDetail>('episodeDetail', (a) => a.getEpisodeDetail(slug), source),
    );
  },

  getGenres(source?: SourceKey): Promise<SourceResultV2<GenreItem[]>> {
    return cacheManager.wrap(`v2:genres:${source ?? 'auto'}`, CACHE_TTL.LIST, () =>
      run<GenreItem[]>('genres', (a) => a.getGenres(), source),
    );
  },

  getSchedule(source?: SourceKey): Promise<SourceResultV2<ScheduleItem[]>> {
    return cacheManager.wrap(`v2:schedule:${source ?? 'auto'}`, CACHE_TTL.LIST, () =>
      run<ScheduleItem[]>('schedule', (a) => a.getSchedule(), source),
    );
  },
};
