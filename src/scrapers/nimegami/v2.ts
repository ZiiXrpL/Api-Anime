import { nimegamiClient } from '../../helpers/axiosClient';
import { SourceError } from '../../interfaces/errors.interface';
import { AnimeDetail, HomeData } from '../../interfaces/anime.interface';
import { parseDetail, parseGenres, parseHome } from '../../parsers/nimegamiV2.parser';

export async function getHome(): Promise<HomeData> {
  try {
    const { data } = await nimegamiClient.get<string>('/');
    return parseHome(data);
  } catch (error) {
    throw new SourceError('Nimegami', `Gagal mengambil home: ${(error as Error).message}`);
  }
}

export async function getAnimeDetail(slug: string): Promise<AnimeDetail> {
  try {
    const { data } = await nimegamiClient.get<string>(`/${encodeURIComponent(slug)}/`);
    return parseDetail(data, slug);
  } catch (error) {
    throw new SourceError('Nimegami', `Gagal mengambil detail "${slug}": ${(error as Error).message}`);
  }
}

export async function getGenres() {
  try {
    const { data } = await nimegamiClient.get<string>('/');
    return parseGenres(data);
  } catch (error) {
    throw new SourceError('Nimegami', `Gagal mengambil genre: ${(error as Error).message}`);
  }
}
