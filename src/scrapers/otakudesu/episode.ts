import { otakudesuClient } from '../../helpers/axiosClient';
import { parseEpisode } from '../../parsers/otakudesu.parser';
import { EpisodeDetail } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getEpisodeDetail(slug: string): Promise<EpisodeDetail> {
  try {
    const { data } = await otakudesuClient.get<string>(`/episode/${slug}`);
    return parseEpisode(data, slug);
  } catch (error) {
    throw new SourceError('Otakudesu', `Gagal mengambil episode "${slug}": ${(error as Error).message}`);
  }
}
