import { samehadakuClient } from '../../helpers/axiosClient';
import { parseHome } from '../../parsers/samehadaku.parser';
import { HomeData } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getHome(): Promise<HomeData> {
  try {
    const { data } = await samehadakuClient.get<string>('/');
    return parseHome(data);
  } catch (error) {
    throw new SourceError('Samehadaku', `Gagal mengambil home: ${(error as Error).message}`);
  }
}
