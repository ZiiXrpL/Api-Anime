import { otakudesuClient } from '../../helpers/axiosClient';
import { parseHome } from '../../parsers/otakudesu.parser';
import { HomeData } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getHome(): Promise<HomeData> {
  try {
    const { data } = await otakudesuClient.get<string>('/');
    return parseHome(data);
  } catch (error) {
    throw new SourceError('Otakudesu', `Gagal mengambil home: ${(error as Error).message}`);
  }
}
