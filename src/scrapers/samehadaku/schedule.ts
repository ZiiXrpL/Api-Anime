import { samehadakuClient } from '../../helpers/axiosClient';
import { parseSchedule } from '../../parsers/samehadaku.parser';
import { ScheduleItem } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getSchedule(): Promise<ScheduleItem[]> {
  try {
    const { data } = await samehadakuClient.get<string>('/jadwal-rilis');
    return parseSchedule(data);
  } catch (error) {
    throw new SourceError('Samehadaku', `Gagal mengambil schedule: ${(error as Error).message}`);
  }
}
