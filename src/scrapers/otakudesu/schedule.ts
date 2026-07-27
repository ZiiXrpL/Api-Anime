import { otakudesuClient } from '../../helpers/axiosClient';
import { parseSchedule } from '../../parsers/otakudesu.parser';
import { ScheduleItem } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';

export async function getSchedule(): Promise<ScheduleItem[]> {
  try {
    const { data } = await otakudesuClient.get<string>('/jadwal-rilis');
    return parseSchedule(data);
  } catch (error) {
    throw new SourceError('Otakudesu', `Gagal mengambil schedule: ${(error as Error).message}`);
  }
}
