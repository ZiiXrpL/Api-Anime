import { samehadakuClient } from '../../helpers/axiosClient';
import { parseEpisode } from '../../parsers/samehadaku.parser';
import { EpisodeDetail } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getEpisodeDetail(slug: string): Promise<EpisodeDetail> {
  try {
    const { data } = await samehadakuClient.get<string>(`/${slug}`);
    return parseEpisode(data, slug);
  } catch (error) {
    throw new SourceError('Samehadaku', `Gagal mengambil episode "${slug}": ${(error as Error).message}`);
  }
}
