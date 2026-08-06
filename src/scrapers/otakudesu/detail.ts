import { otakudesuClient } from '../../helpers/axiosClient';
import { parseDetail } from '../../parsers/otakudesu.parser';
import { AnimeDetail } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getAnimeDetail(slug: string): Promise<AnimeDetail> {
  try {
    const { data } = await otakudesuClient.get<string>(`/anime/${slug}`);
    return parseDetail(data, slug);
  } catch (error) {
    throw new SourceError('Otakudesu', `Gagal mengambil detail anime "${slug}": ${(error as Error).message}`);
  }
}
