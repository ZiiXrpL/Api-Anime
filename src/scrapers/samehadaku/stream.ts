import { StreamServer } from '../../interfaces/anime.interface';
import { getEpisodeDetail } from './episode';

export async function getStreamServers(episodeSlug: string): Promise<StreamServer[]> {
  const episode = await getEpisodeDetail(episodeSlug);
  return episode.streamServers;
}
