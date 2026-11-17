import { AnimeAdapter, SourceKey } from './types';
import { AnimeCard } from '../interfaces/anime.interface';
import { env } from '../configs/env';

import * as OH from '../scrapers/otakudesu/home';
import * as OO from '../scrapers/otakudesu/ongoing';
import * as OC from '../scrapers/otakudesu/completed';
import * as OA from '../scrapers/otakudesu/anime';
import * as OS from '../scrapers/otakudesu/search';
import * as OD from '../scrapers/otakudesu/detail';
import * as OE from '../scrapers/otakudesu/episode';
import * as OG from '../scrapers/otakudesu/genre';
import * as OSc from '../scrapers/otakudesu/schedule';

import * as NV2 from '../scrapers/nimegami/v2';
import * as NEV2 from '../scrapers/nimegami/episodeV2';

import * as KH from '../scrapers/kuramanime/anime';
import * as KD from '../scrapers/kuramanime/detail';

import * as SH from '../scrapers/samehadaku/home';
import * as SO from '../scrapers/samehadaku/ongoing';
import * as SC from '../scrapers/samehadaku/completed';
import * as SA from '../scrapers/samehadaku/anime';
import * as SS from '../scrapers/samehadaku/search';
import * as SD from '../scrapers/samehadaku/detail';
import * as SE from '../scrapers/samehadaku/episode';
import * as SG from '../scrapers/samehadaku/genre';
import * as SSc from '../scrapers/samehadaku/schedule';

function episodesFromDetail(list: { title: string; slug: string; url: string }[]): AnimeCard[] {
  return list.map((e) => ({ title: e.title, slug: e.slug, poster: '', url: e.url }));
}

const otakudesu: AnimeAdapter = {
  key: 'otakudesu',
  displayName: 'Otakudesu',
  baseUrl: env.OTAKUDESU_URL,
  capabilities: { home: true, ongoing: true, completed: true, list: true, search: true, detail: true, episodes: true, episodeDetail: true, playback: true, download: true, genres: true, schedule: true },
  getHome: OH.getHome,
  getOngoing: OO.getOngoing,
  getCompleted: OC.getCompleted,
  getAnimeList: OA.getAllAnime,
  searchAnime: OS.searchAnime,
  getAnimeDetail: OD.getAnimeDetail,
  getEpisodes: async (slug) => episodesFromDetail((await OD.getAnimeDetail(slug)).episodeList),
  getEpisodeDetail: OE.getEpisodeDetail,
  getGenres: OG.getGenreList,
  getSchedule: OSc.getSchedule,
};

// Nimegami sudah pindah ke Next.js. Homepage & halaman detail server-rendered
// (data nyata), tetapi halaman daftar/ongoing/completed/search hanya berisi
// skeleton yang diisi oleh JavaScript di browser. Sesuai aturan "jangan
// memaksakan fungsi yang tidak tersedia", capability itu dinonaktifkan.
const nimegami: AnimeAdapter = {
  key: 'nimegami',
  displayName: 'Nimegami',
  baseUrl: env.NIMEGAMI_URL,
  // Detail & episode server-rendered. URL media MP4 diambil dari rute
  // unduh resmi Nimegami -> halaman BerkasDrive -> tautan file langsung.
  capabilities: { home: true, ongoing: true, completed: true, list: true, search: true, detail: true, episodes: true, episodeDetail: true, playback: true, download: true, genres: true, schedule: false },
  getHome: NV2.getHome,
  getOngoing: NV2.getOngoing,
  getCompleted: NV2.getCompleted,
  getAnimeList: NV2.getAnimeList,
  searchAnime: NV2.searchAnime,
  getAnimeDetail: NV2.getAnimeDetail,
  getEpisodes: async (slug) => episodesFromDetail((await NV2.getAnimeDetail(slug)).episodeList),
  getEpisodeDetail: NEV2.getEpisodeDetail,
  getGenres: async () => NV2.getGenres(),
  getSchedule: async () => [],
};

const kuramanime: AnimeAdapter = {
  key: 'kuramanime',
  displayName: 'Kuramanime',
  baseUrl: env.KURAMANIME_URL,
  // Halaman episode server-rendered (judul & navigasi), tetapi URL player
  // hanya dibentuk di browser dari token data-kk via player.min.js. Tidak
  // ada URL media/iframe statis di HTML dan tidak ada tautan unduh resmi —
  // capability playback/download jujur false (tidak merekayasa proteksi JS).
  capabilities: { home: true, ongoing: true, completed: true, list: true, search: true, detail: true, episodes: true, episodeDetail: true, playback: false, download: false, genres: true, schedule: true },
  getHome: KH.getHome,
  getOngoing: KH.getOngoing,
  getCompleted: KH.getCompleted,
  getAnimeList: KH.getAllAnime,
  searchAnime: KH.searchAnime,
  getAnimeDetail: KD.getAnimeDetail,
  getEpisodes: async (slug) => episodesFromDetail((await KD.getAnimeDetail(slug)).episodeList),
  getEpisodeDetail: KD.getEpisodeDetail,
  getGenres: KD.getGenres,
  getSchedule: KD.getSchedule,
};

const samehadaku: AnimeAdapter = {
  key: 'samehadaku',
  displayName: 'Samehadaku',
  baseUrl: env.SAMEHADAKU_URL,
  // Route /anime-completed dan /jadwal-rilis sudah 404 di situs aktual;
  // capability ini dinonaktifkan daripada mengembalikan data sumber lain.
  capabilities: { home: true, ongoing: true, completed: false, list: true, search: true, detail: true, episodes: true, episodeDetail: true, playback: true, download: true, genres: true, schedule: false },
  getHome: SH.getHome,
  getOngoing: SO.getOngoing,
  getCompleted: SC.getCompleted,
  getAnimeList: SA.getAllAnime,
  searchAnime: SS.searchAnime,
  getAnimeDetail: SD.getAnimeDetail,
  getEpisodes: async (slug) => episodesFromDetail((await SD.getAnimeDetail(slug)).episodeList),
  getEpisodeDetail: SE.getEpisodeDetail,
  getGenres: SG.getGenreList,
  getSchedule: SSc.getSchedule,
};

export const adapters: Record<SourceKey, AnimeAdapter> = {
  otakudesu,
  nimegami,
  kuramanime,
  samehadaku,
};

/** Urutan fallback default berdasarkan reliabilitas hasil pengujian. */
export const DEFAULT_FALLBACK_ORDER: SourceKey[] = ['otakudesu', 'kuramanime', 'nimegami', 'samehadaku'];

export function getAdapter(key: SourceKey): AnimeAdapter {
  return adapters[key];
}
