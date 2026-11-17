import { kuramanimeClient } from '../../helpers/axiosClient';
import { SourceError } from '../../interfaces/errors.interface';

export async function fetchKuramanimeHtml(path: string, label: string): Promise<string> {
  try {
    const { data } = await kuramanimeClient.get<string>(path);
    if (typeof data !== 'string' || data.length < 500) {
      throw new Error('Respons HTML kosong atau terlalu pendek');
    }
    return data;
  } catch (error) {
    throw new SourceError('Kuramanime', `Gagal ${label}: ${(error as Error).message}`);
  }
}
