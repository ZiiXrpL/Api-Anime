import { otakudesuClient } from '../../helpers/axiosClient';
import { parseEpisode, parseMirrorCandidates } from '../../parsers/otakudesu.parser';
import { resolveOtakudesuStreamUrl } from '../../helpers/otakudesuStreamResolver';
import { EpisodeDetail } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';
import { logger } from '../../utils/logger';

export async function getEpisodeDetail(slug: string): Promise<EpisodeDetail> {
  try {
    const { data } = await otakudesuClient.get<string>(`/episode/${slug}`);
    const detail = parseEpisode(data, slug);

    const candidates = parseMirrorCandidates(data);
    const defaultPerQuality = new Map<string, (typeof candidates)[number]>();
    for (const c of candidates) {
      if (!defaultPerQuality.has(c.quality) || c.isDefault) {
        defaultPerQuality.set(c.quality, c);
      }
    }

    const resolved = await Promise.allSettled(
      Array.from(defaultPerQuality.values()).map(async (c) => ({
        quality: c.quality,
        provider: c.provider,
        url: await resolveOtakudesuStreamUrl(otakudesuClient, c.content),
      })),
    );

    detail.streamServers = resolved
      .filter((r): r is PromiseFulfilledResult<{ quality: string; provider: string; url: string }> => {
        if (r.status === 'rejected') {
          logger.warn(`Resolve stream server gagal untuk episode "${slug}": ${r.reason}`);
          return false;
        }
        return true;
      })
      .map((r) => ({ name: r.value.provider, quality: r.value.quality, url: r.value.url }));

    return detail;
  } catch (error) {
    throw new SourceError('Otakudesu', `Gagal mengambil episode "${slug}": ${(error as Error).message}`);
  }
}
