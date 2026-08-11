import { nimegamiClient } from '../../helpers/axiosClient';
import { parseArchiveList } from '../../parsers/nimegami.parser';
import { AnimeCard } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getCompleted(page = 1): Promise<AnimeCard[]> {
  try {
    const path = page > 1 ? `/tag/complete/page/${page}/` : '/tag/complete/';
    const { data } = await nimegamiClient.get<string>(path);
    return parseArchiveList(data);
  } catch (error) {
    throw new SourceError('Nimegami', `Gagal mengambil completed: ${(error as Error).message}`);
  }
}
