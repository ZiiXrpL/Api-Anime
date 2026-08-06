import { cacheManager } from '../helpers/cacheManager';
import { CACHE_TTL } from '../configs/cache';
import { withFallback } from './sourceManager.service';

import * as OtakudesuHome from '../scrapers/otakudesu/home';
import * as OtakudesuOngoing from '../scrapers/otakudesu/ongoing';
import * as OtakudesuCompleted from '../scrapers/otakudesu/completed';
import * as OtakudesuMovie from '../scrapers/otakudesu/movie';
import * as OtakudesuSchedule from '../scrapers/otakudesu/schedule';
import * as OtakudesuGenre from '../scrapers/otakudesu/genre';
import * as OtakudesuSearch from '../scrapers/otakudesu/search';
import * as OtakudesuAnimeList from '../scrapers/otakudesu/anime';
import * as OtakudesuDetail from '../scrapers/otakudesu/detail';
import * as OtakudesuEpisode from '../scrapers/otakudesu/episode';
import * as OtakudesuStream from '../scrapers/otakudesu/stream';
import * as OtakudesuDownload from '../scrapers/otakudesu/download';

import * as SamehadakuHome from '../scrapers/samehadaku/home';
import * as SamehadakuOngoing from '../scrapers/samehadaku/ongoing';
import * as SamehadakuCompleted from '../scrapers/samehadaku/completed';
import * as SamehadakuMovie from '../scrapers/samehadaku/movie';
import * as SamehadakuSchedule from '../scrapers/samehadaku/schedule';
import * as SamehadakuGenre from '../scrapers/samehadaku/genre';
import * as SamehadakuSearch from '../scrapers/samehadaku/search';
import * as SamehadakuAnimeList from '../scrapers/samehadaku/anime';
import * as SamehadakuDetail from '../scrapers/samehadaku/detail';
import * as SamehadakuEpisode from '../scrapers/samehadaku/episode';
import * as SamehadakuStream from '../scrapers/samehadaku/stream';
import * as SamehadakuDownload from '../scrapers/samehadaku/download';

import { SourceResult } from './sourceManager.service';
import {
  AnimeCard,
  AnimeDetail,
  CombinedGenreItem,
  DownloadGroup,
  EpisodeDetail,
  GenreItem,
  HomeData,
  ScheduleItem,
  StreamServer,
} from '../interfaces/anime.interface';
import { logger } from '../utils/logger';

// Normalisasi nama genre supaya bisa dicocokkan antar sumber walau beda
// kapitalisasi/spasi (mis. "Slice of Life" milik Otakudesu vs "slice of life"
// milik Samehadaku harus dianggap genre yang sama).
function normalizeGenreName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export const animeService = {
  getHome(): Promise<SourceResult<HomeData>> {
    return cacheManager.wrap('home', CACHE_TTL.HOME, () =>
      withFallback(OtakudesuHome.getHome, SamehadakuHome.getHome),
    );
  },

  getOngoing(page: number): Promise<SourceResult<AnimeCard[]>> {
    return cacheManager.wrap(`ongoing:${page}`, CACHE_TTL.LIST, () =>
      withFallback(() => OtakudesuOngoing.getOngoing(page), () => SamehadakuOngoing.getOngoing(page)),
    );
  },

  getCompleted(page: number): Promise<SourceResult<AnimeCard[]>> {
    return cacheManager.wrap(`completed:${page}`, CACHE_TTL.LIST, () =>
      withFallback(() => OtakudesuCompleted.getCompleted(page), () => SamehadakuCompleted.getCompleted(page)),
    );
  },

  getMovies(page: number): Promise<SourceResult<AnimeCard[]>> {
    return cacheManager.wrap(`movies:${page}`, CACHE_TTL.LIST, () =>
      withFallback(() => OtakudesuMovie.getMovies(page), () => SamehadakuMovie.getMovies(page)),
    );
  },

  getSchedule(): Promise<SourceResult<ScheduleItem[]>> {
    return cacheManager.wrap('schedule', CACHE_TTL.LIST, () =>
      withFallback(OtakudesuSchedule.getSchedule, SamehadakuSchedule.getSchedule),
    );
  },

  getGenreList(): Promise<SourceResult<GenreItem[]>> {
    return cacheManager.wrap('genres', CACHE_TTL.LIST, () =>
      withFallback(OtakudesuGenre.getGenreList, SamehadakuGenre.getGenreList),
    );
  },

  // Daftar genre GABUNGAN dari kedua sumber, dengan slug ASLI masing-masing
  // sumber disimpan terpisah (otakudesuSlug / samehadakuSlug). Ini dipakai
  // oleh getAnimeByGenre() supaya saat fallback ke sumber kedua, request
  // tetap memakai slug yang benar-benar valid di sumber itu -- bukan slug
  // dari sumber lain yang formatnya bisa berbeda (mis. "isekai" vs
  // "isekai-2") sehingga selama ini fallback selalu balik kosong.
  getCombinedGenreList(): Promise<CombinedGenreItem[]> {
    return cacheManager.wrap<CombinedGenreItem[]>('genres:combined', CACHE_TTL.LIST, async () => {
      const [otakudesuList, samehadakuList] = await Promise.all([
        OtakudesuGenre.getGenreList().catch((err) => {
          logger.warn(`Gagal ambil genre list Otakudesu: ${(err as Error).message}`);
          return [] as GenreItem[];
        }),
        SamehadakuGenre.getGenreList().catch((err) => {
          logger.warn(`Gagal ambil genre list Samehadaku: ${(err as Error).message}`);
          return [] as GenreItem[];
        }),
      ]);

      const byName = new Map<string, CombinedGenreItem>();

      for (const g of otakudesuList) {
        const key = normalizeGenreName(g.name);
        byName.set(key, { name: g.name, slug: g.slug, otakudesuSlug: g.slug });
      }
      for (const g of samehadakuList) {
        const key = normalizeGenreName(g.name);
        const existing = byName.get(key);
        if (existing) {
          existing.samehadakuSlug = g.slug;
        } else {
          byName.set(key, { name: g.name, slug: g.slug, samehadakuSlug: g.slug });
        }
      }

      return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
    });
  },

  async getAnimeByGenre(slug: string, page: number): Promise<SourceResult<AnimeCard[]>> {
    return cacheManager.wrap(`genre:${slug}:${page}`, CACHE_TTL.LIST, async () => {
      const combined = await this.getCombinedGenreList();
      const lower = slug.trim().toLowerCase();
      const match = combined.find(
        (g) => g.otakudesuSlug?.toLowerCase() === lower || g.samehadakuSlug?.toLowerCase() === lower,
      );

      // Slug dikenali di peta gabungan -> pakai slug ASLI tiap sumber,
      // urutan coba: sumber yang punya slug ini duluan.
      if (match) {
        type Attempt = { source: 'Otakudesu' | 'Samehadaku'; run: () => Promise<AnimeCard[]> };
        const attempts: Attempt[] = [];
        if (match.otakudesuSlug) {
          attempts.push({
            source: 'Otakudesu',
            run: () => OtakudesuGenre.getAnimeByGenre(match.otakudesuSlug as string, page),
          });
        }
        if (match.samehadakuSlug) {
          attempts.push({
            source: 'Samehadaku',
            run: () => SamehadakuGenre.getAnimeByGenre(match.samehadakuSlug as string, page),
          });
        }
        // Kalau slug yang diklik cocok ke Samehadaku, coba Samehadaku duluan.
        if (lower === match.samehadakuSlug?.toLowerCase() && attempts.length === 2) {
          attempts.reverse();
        }

        for (const attempt of attempts) {
          try {
            const data = await attempt.run();
            if (data.length > 0) {
              return { source: attempt.source, data } as SourceResult<AnimeCard[]>;
            }
          } catch (err) {
            logger.warn(`getAnimeByGenre gagal untuk slug "${slug}" (${attempt.source}): ${(err as Error).message}`);
          }
        }
        return { source: 'Otakudesu', data: [] } as SourceResult<AnimeCard[]>;
      }

      // Slug tidak dikenali di peta gabungan (mis. genre map belum ke-cache /
      // input tidak standar) -> fallback lama: coba slug apa adanya ke kedua
      // sumber, lebih baik daripada langsung menyerah.
      return withFallback(
        () => OtakudesuGenre.getAnimeByGenre(slug, page),
        () => SamehadakuGenre.getAnimeByGenre(slug, page),
      );
    });
  },

  search(query: string): Promise<SourceResult<AnimeCard[]>> {
    // Hasil pencarian tidak di-cache lama karena sifatnya dinamis per query
    return cacheManager.wrap(`search:${query}`, CACHE_TTL.LIST, () =>
      withFallback(() => OtakudesuSearch.searchAnime(query), () => SamehadakuSearch.searchAnime(query)),
    );
  },

  getAllAnime(page: number): Promise<SourceResult<AnimeCard[]>> {
    return cacheManager.wrap(`anime-list:${page}`, CACHE_TTL.LIST, () =>
      withFallback(() => OtakudesuAnimeList.getAllAnime(page), () => SamehadakuAnimeList.getAllAnime(page)),
    );
  },

  getAnimeDetail(slug: string): Promise<SourceResult<AnimeDetail>> {
    return cacheManager.wrap(`detail:${slug}`, CACHE_TTL.DETAIL, () =>
      withFallback(() => OtakudesuDetail.getAnimeDetail(slug), () => SamehadakuDetail.getAnimeDetail(slug)),
    );
  },

  getEpisodeDetail(slug: string): Promise<SourceResult<EpisodeDetail>> {
    return cacheManager.wrap(`episode:${slug}`, CACHE_TTL.EPISODE, () =>
      withFallback(() => OtakudesuEpisode.getEpisodeDetail(slug), () => SamehadakuEpisode.getEpisodeDetail(slug)),
    );
  },

  getStreamServers(slug: string): Promise<SourceResult<StreamServer[]>> {
    return cacheManager.wrap(`stream:${slug}`, CACHE_TTL.EPISODE, () =>
      withFallback(() => OtakudesuStream.getStreamServers(slug), () => SamehadakuStream.getStreamServers(slug)),
    );
  },

  getDownloadLinks(slug: string): Promise<SourceResult<DownloadGroup[]>> {
    return cacheManager.wrap(`download:${slug}`, CACHE_TTL.EPISODE, () =>
      withFallback(() => OtakudesuDownload.getDownloadLinks(slug), () => SamehadakuDownload.getDownloadLinks(slug)),
    );
  },

  getBatchDownload(slug: string): Promise<SourceResult<DownloadGroup[]>> {
    return cacheManager.wrap(`batch:${slug}`, CACHE_TTL.EPISODE, () =>
      withFallback(() => OtakudesuDownload.getBatchDownload(slug), () => SamehadakuDownload.getBatchDownload(slug)),
    );
  },

  async getRecommendation(): Promise<SourceResult<AnimeCard[]>> {
    return cacheManager.wrap('recommendation', CACHE_TTL.HOME, async () => {
      const result = await withFallback(OtakudesuHome.getHome, SamehadakuHome.getHome);
      const pool = [...result.data.ongoing, ...result.data.completed];
      const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 10);
      return { source: result.source, data: shuffled };
    });
  },

  async getRandom(): Promise<SourceResult<AnimeCard>> {
    const result = await withFallback(OtakudesuHome.getHome, SamehadakuHome.getHome);
    const pool = [...result.data.ongoing, ...result.data.completed];
    if (pool.length === 0) {
      throw new Error('Tidak ada data anime untuk dipilih secara acak');
    }
    const randomIndex = Math.floor(Math.random() * pool.length);
    return { source: result.source, data: pool[randomIndex] as AnimeCard };
  },
};
