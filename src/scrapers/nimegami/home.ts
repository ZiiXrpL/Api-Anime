import { HomeData } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';
import { getOngoing } from './ongoing';
import { getCompleted } from './completed';

export async function getHome(): Promise<HomeData> {
  try {
    const [ongoing, completed] = await Promise.all([getOngoing(1), getCompleted(1)]);
    return { ongoing, completed };
  } catch (error) {
    throw new SourceError('Nimegami', `Gagal mengambil home: ${(error as Error).message}`);
  }
}
