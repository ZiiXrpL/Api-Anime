import { AnimeCard, AnimeDetail, EpisodeDetail, GenreItem, ScheduleItem } from '../../interfaces/anime.interface';
import {
  detailPathFromSlug,
  parseAnimeCards,
  parseDetail,
  parseEpisodeDetail,
  parseGenreList,
  parseSchedule,
} from '../../parsers/kuramanime.parser';
import { fetchKuramanimeHtml } from './_shared';

export async function getAnimeDetail(slug: string): Promise<AnimeDetail> {
  const html = await fetchKuramanimeHtml(detailPathFromSlug(slug), `detail "${slug}"`);
  return parseDetail(html, slug);
}

export async function getEpisodeDetail(slug: string): Promise<EpisodeDetail> {
  const html = await fetchKuramanimeHtml(detailPathFromSlug(slug), `episode "${slug}"`);
  return parseEpisodeDetail(html, slug);
}

export async function getGenres(): Promise<GenreItem[]> {
  return parseGenreList(await fetchKuramanimeHtml('/properties/genre', 'daftar genre'));
}

export async function getAnimeByGenre(slug: string, page = 1): Promise<AnimeCard[]> {
  const path = page > 1 ? `/properties/genre/${encodeURIComponent(slug)}?page=${page}` : `/properties/genre/${encodeURIComponent(slug)}`;
  return parseAnimeCards(await fetchKuramanimeHtml(path, `genre "${slug}"`));
}

export async function getSchedule(): Promise<ScheduleItem[]> {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const results = await Promise.all(
    days.map(async (day) => {
      try {
        return parseSchedule(await fetchKuramanimeHtml(`/schedule?scheduled_day=${day}`, `jadwal ${day}`), day);
      } catch {
        return [] as ScheduleItem[];
      }
    }),
  );
  return ([] as ScheduleItem[]).concat(...results);
}
