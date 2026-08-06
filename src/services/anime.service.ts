import { cacheManager } from '../helpers/cacheManager';
import { CACHE_TTL } from '../configs/cache';

import * as KuramanimeList from '../scrapers/kuramanime/list';
import * as KuramanimeGenre from '../scrapers/kuramanime/genre';
import * as KuramanimeSearch from '../scrapers/kuramanime/search';
import * as KuramanimeDetail from '../scrapers/kuramanime/detail';
import * as KuramanimeEpisode from '../scrapers/kuramanime/episode';
import * as KuramanimeSchedule from '../scrapers/kuramanime/schedule';

import { SourceResult } from './sourceManager.service';
import {
  AnimeCard,
  AnimeDetail,
  DownloadGroup,
  EpisodeDetail,
  GenreItem,
  HomeData,
  ScheduleItem,
  StreamServer,
} from '../interfaces/anime.interface';
import { logger } from '../utils/logger';

const SOURCE = 'Kuramanime' as const;

// CATATAN ARSITEKTUR: sejak migrasi ke Kuramanime, sistem ini cuma pakai
// SATU sumber anime (dulu ada fallback Otakudesu <-> Samehadaku, sekarang
// tidak perlu lagi karena cuma ada satu). Video streaming & link download
// Kuramanime butuh headless browser (lihat scrapers/kuramanime/episode.ts)
// karena dilindungi verifikasi JS/fingerprint -- request HTTP biasa akan
// selalu ditolak untuk bagian itu secara spesifik. Bagian lain (listing,
// genre, search, detail) tetap pakai HTTP biasa (axios+cheerio) karena
// server-rendered penuh, tidak butuh browser.
//
// Cache untuk data episode (video+download) sengaja lebih PENDEK dari
// bagian lain -- URL video Kuramanime membawa parameter yang terlihat
// seperti token/tanda waktu (mis. "?lud=...&sid=...") yang berpotensi
// kedaluwarsa. Cache lama = risiko user dikasih link video yang sudah mati.
const EPISODE_CACHE_TTL = Math.min(CACHE_TTL.EPISODE, 3600); // maksimal 1 jam

export const animeService = {
  getHome(): Promise<SourceResult<HomeData>> {
    return cacheManager.wrap('home', CACHE_TTL.HOME, async () => {
      const data = await KuramanimeList.getHome();
      return { source: SOURCE, data };
    });
  },

  getOngoing(page: number): Promise<SourceResult<AnimeCard[]>> {
    return cacheManager.wrap(`ongoing:${page}`, CACHE_TTL.LIST, async () => {
      const data = await KuramanimeList.getOngoing(page);
      return { source: SOURCE, data };
    });
  },

  getCompleted(page: number): Promise<SourceResult<AnimeCard[]>> {
    return cacheManager.wrap(`completed:${page}`, CACHE_TTL.LIST, async () => {
      const data = await KuramanimeList.getCompleted(page);
      return { source: SOURCE, data };
    });
  },

  getMovies(page: number): Promise<SourceResult<AnimeCard[]>> {
    return cacheManager.wrap(`movies:${page}`, CACHE_TTL.LIST, async () => {
      const data = await KuramanimeList.getMovies(page);
      return { source: SOURCE, data };
    });
  },

  getSchedule(): Promise<SourceResult<ScheduleItem[]>> {
    return cacheManager.wrap('schedule', CACHE_TTL.LIST, async () => {
      const data = await KuramanimeSchedule.getSchedule();
      return { source: SOURCE, data };
    });
  },

  getGenreList(): Promise<SourceResult<GenreItem[]>> {
    return cacheManager.wrap('genres', CACHE_TTL.LIST, async () => {
      const data = await KuramanimeGenre.getGenreList();
      return { source: SOURCE, data };
    });
  },

  getAnimeByGenre(slug: string, page: number): Promise<SourceResult<AnimeCard[]>> {
    return cacheManager.wrap(`genre:${slug}:${page}`, CACHE_TTL.LIST, async () => {
      const data = await KuramanimeGenre.getAnimeByGenre(slug, page);
      return { source: SOURCE, data };
    });
  },

  search(query: string): Promise<SourceResult<AnimeCard[]>> {
    return cacheManager.wrap(`search:${query}`, CACHE_TTL.LIST, async () => {
      const data = await KuramanimeSearch.searchAnime(query);
      return { source: SOURCE, data };
    });
  },

  getAllAnime(page: number): Promise<SourceResult<AnimeCard[]>> {
    return cacheManager.wrap(`anime-list:${page}`, CACHE_TTL.LIST, async () => {
      const data = await KuramanimeSearch.getAllAnime(page);
      return { source: SOURCE, data };
    });
  },

  getAnimeDetail(slug: string): Promise<SourceResult<AnimeDetail>> {
    return cacheManager.wrap(`detail:${slug}`, CACHE_TTL.DETAIL, async () => {
      const data = await KuramanimeDetail.getAnimeDetail(slug);
      return { source: SOURCE, data };
    });
  },

  getEpisodeDetail(slug: string): Promise<SourceResult<EpisodeDetail>> {
    return cacheManager.wrap(`episode:${slug}`, EPISODE_CACHE_TTL, async () => {
      const data = await KuramanimeEpisode.getEpisodeDetail(slug);
      return { source: SOURCE, data };
    });
  },

  getStreamServers(slug: string): Promise<SourceResult<StreamServer[]>> {
    return cacheManager.wrap(`stream:${slug}`, EPISODE_CACHE_TTL, async () => {
      const ep = await KuramanimeEpisode.getEpisodeDetail(slug);
      return { source: SOURCE, data: ep.streamServers };
    });
  },

  getDownloadLinks(slug: string): Promise<SourceResult<DownloadGroup[]>> {
    return cacheManager.wrap(`download:${slug}`, EPISODE_CACHE_TTL, async () => {
      const ep = await KuramanimeEpisode.getEpisodeDetail(slug);
      return { source: SOURCE, data: ep.downloadList };
    });
  },

  async getBatchDownload(_slug: string): Promise<SourceResult<DownloadGroup[]>> {
    // Kuramanime punya tab "Batch" di halaman episode, tapi berdasarkan
    // sampel yang sudah diverifikasi selalu berisi "- batch belum
    // tersedia -" untuk anime yang masih ongoing. Belum diverifikasi
    // untuk anime yang sudah selesai tayang -- untuk sekarang dikembalikan
    // kosong dulu daripada menebak struktur yang belum pernah dilihat.
    logger.warn('Kuramanime: getBatchDownload belum diimplementasi penuh (belum ada sampel HTML batch yang tersedia).');
    return { source: SOURCE, data: [] };
  },

  async getRecommendation(): Promise<SourceResult<AnimeCard[]>> {
    return cacheManager.wrap('recommendation', CACHE_TTL.HOME, async () => {
      const home = await KuramanimeList.getHome();
      const pool = [...home.ongoing, ...home.completed];
      const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 10);
      return { source: SOURCE, data: shuffled };
    });
  },

  async getRandom(): Promise<SourceResult<AnimeCard>> {
    const home = await KuramanimeList.getHome();
    const pool = [...home.ongoing, ...home.completed];
    if (pool.length === 0) {
      throw new Error('Tidak ada data anime untuk dipilih secara acak');
    }
    const randomIndex = Math.floor(Math.random() * pool.length);
    return { source: SOURCE, data: pool[randomIndex] as AnimeCard };
  },
};
