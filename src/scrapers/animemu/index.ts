import axios, { AxiosInstance } from 'axios';
import { env } from '../../configs/env';
import { SourceError } from '../../interfaces/errors.interface';
import {
  AnimeCard,
  AnimeDetail,
  EpisodeDetail,
  EpisodeItem,
  GenreItem,
  HomeData,
  StreamServer,
} from '../../interfaces/anime.interface';

const client: AxiosInstance = axios.create({
  baseURL: env.ANIMEMU_URL,
  timeout: env.REQUEST_TIMEOUT_MS,
  headers: {
    'User-Agent': 'Mozilla/5.0',
    Accept: 'application/json',
  },
});

type RawAnime = Record<string, any>;
type RawEpisode = Record<string, any>;

async function getJson<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  try {
    const { data } = await client.get<T>(path, { params });
    return data;
  } catch (error) {
    throw new SourceError('AnimeMu', `Gagal ${path}: ${(error as Error).message}`);
  }
}

function absoluteUrl(value: string | null | undefined): string {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${env.ANIMEMU_URL}${value.startsWith('/') ? '' : '/'}${value}`;
}

function mapCard(raw: RawAnime): AnimeCard {
  return {
    title: raw.title || raw.title_romaji || 'Unknown',
    slug: raw.slug || '',
    poster: raw.cover_image || '',
    url: `${env.ANIMEMU_URL}/anime/${raw.slug || ''}`,
    episode: raw.latest_episode_number ? String(raw.latest_episode_number) : undefined,
    score: raw.rating ? String(raw.rating) : undefined,
    status: raw.status || undefined,
    type: raw.type || undefined,
  };
}

function mapEpisode(raw: RawEpisode, animeSlug: string): EpisodeItem {
  return {
    title: raw.title || `Episode ${raw.episode_number}`,
    slug: `animemu-${animeSlug}--ep-${raw.episode_number}`,
    url: `${env.ANIMEMU_URL}/watch/${animeSlug}/${raw.episode_number}`,
    releaseDate: raw.created_at ? String(raw.created_at) : undefined,
  };
}

function parseGenres(value: unknown): GenreItem[] {
  if (Array.isArray(value)) {
    return value.flatMap((name) => {
      const label = typeof name === 'string' ? name : String((name as RawAnime)?.name ?? '');
      const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return label && slug ? [{ name: label.trim(), slug, url: `${env.ANIMEMU_URL}/genre/${slug}` }] : [];
    });
  }
  if (typeof value === 'string') {
    return parseGenres(value.split(','));
  }
  return [];
}

export async function getHome(): Promise<HomeData> {
  const [latest, popular] = await Promise.all([
    getJson<{ data?: RawAnime[] }>('/api/anime/latest'),
    getJson<{ data?: RawAnime[] }>('/api/anime/popular'),
  ]);
  const seen = new Set<string>();
  const ongoing = [...(latest.data || []), ...(popular.data || [])]
    .map(mapCard)
    .filter((card) => {
      if (!card.slug || seen.has(card.slug)) return false;
      seen.add(card.slug);
      return true;
    });
  return { ongoing, completed: [] };
}

export async function getOngoing(): Promise<AnimeCard[]> {
  const json = await getJson<{ data?: RawAnime[] }>('/api/anime/latest');
  return (json.data || []).map(mapCard);
}

export async function getCompleted(): Promise<AnimeCard[]> {
  return [];
}

export async function getAnimeList(): Promise<AnimeCard[]> {
  const [latest, top] = await Promise.all([
    getJson<{ data?: RawAnime[] }>('/api/anime/latest'),
    getJson<{ data?: RawAnime[] }>('/api/anime/top'),
  ]);
  const seen = new Set<string>();
  return [...(latest.data || []), ...(top.data || [])]
    .map(mapCard)
    .filter((card) => {
      if (!card.slug || seen.has(card.slug)) return false;
      seen.add(card.slug);
      return true;
    });
}

export async function searchAnime(query: string): Promise<AnimeCard[]> {
  const json = await getJson<{ data?: RawAnime[] }>('/api/anime/search', { q: query });
  return (json.data || []).map(mapCard);
}

export async function getAnimeDetail(slug: string): Promise<AnimeDetail> {
  const json = await getJson<{ data?: RawAnime }>(`/api/anime/${encodeURIComponent(slug)}`);
  const raw = json.data;
  if (!raw || !raw.title) throw new SourceError('AnimeMu', `Anime "${slug}" tidak ditemukan`);
  const episodes = await getJson<{ data?: RawEpisode[] }>(`/api/episodes/${encodeURIComponent(slug)}`);
  return {
    title: raw.title,
    slug: raw.slug || slug,
    poster: raw.cover_image || '',
    synopsis: raw.synopsis || undefined,
    score: raw.rating ? String(raw.rating) : undefined,
    status: raw.status || undefined,
    type: raw.type || undefined,
    releaseYear: raw.release_date ? String(raw.release_date).slice(0, 4) : undefined,
    studio: raw.studio || undefined,
    genres: parseGenres(raw.genre),
    episodeList: (episodes.data || []).map((episode) => mapEpisode(episode, slug)),
  };
}

export async function getEpisodes(slug: string): Promise<AnimeCard[]> {
  const detail = await getAnimeDetail(slug);
  return detail.episodeList.map((episode) => ({
    title: episode.title,
    slug: episode.slug,
    poster: detail.poster,
    url: episode.url,
  }));
}

export async function getEpisodeDetail(slug: string): Promise<EpisodeDetail> {
  const matched = slug.match(/^animemu-(.+)--ep-(\d+)$/);
  if (!matched) throw new SourceError('AnimeMu', `Slug episode tidak dikenali: ${slug}`);
  const animeSlug = matched[1];
  const number = Number(matched[2]);
  const json = await getJson<{ data?: RawEpisode[] }>(`/api/episodes/${encodeURIComponent(animeSlug)}`);
  const episode = (json.data || []).find((item) => Number(item.episode_number) === number);
  if (!episode) throw new SourceError('AnimeMu', `Episode ${number} tidak ditemukan`);

  const servers: StreamServer[] = [];
  const addServer = (quality: string, value: unknown) => {
    if (typeof value !== 'string' || !value) return;
    const url = absoluteUrl(value);
    if (!url) return;
    servers.push({ name: `AnimeMu ${quality}`, quality, url });
  };
  for (const [quality, url] of Object.entries(episode.quality_urls || {})) {
    addServer(quality, url);
  }
  if (!servers.length) addServer(String(episode.default_quality || '720'), episode.stream_url);

  return {
    title: episode.title || `Episode ${number}`,
    slug,
    animeSlug,
    streamServers: servers,
    downloadList: [],
    navigation: { allEpisodeSlug: animeSlug },
  };
}

export async function getGenres(): Promise<GenreItem[]> {
  return [];
}

export async function getSchedule() {
  return [];
}
