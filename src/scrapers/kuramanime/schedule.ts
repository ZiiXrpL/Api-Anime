import * as cheerio from 'cheerio';
import { fetchHtml } from '../../helpers/browserManager';
import { env } from '../../configs/env';
import { ScheduleItem } from '../../interfaces/anime.interface';
import { parseAnimeCards } from './cardParser';
import { logger } from '../../utils/logger';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABEL_ID: Record<string, string> = {
  sunday: 'Minggu',
  monday: 'Senin',
  tuesday: 'Selasa',
  wednesday: 'Rabu',
  thursday: 'Kamis',
  friday: 'Jumat',
  saturday: 'Sabtu',
};

// CATATAN JUJUR: berbeda dari home/genre/list yang sudah dites pakai HTML
// asli dari Kuramanime, halaman /schedule ini BELUM sempat diverifikasi
// dengan sampel HTML nyata -- struktur di bawah adalah tebakan berdasar
// pola grid yang sama dipakai di halaman lain situs ini. Kalau hasilnya
// kosong terus di production, ini titik pertama yang perlu dicek ulang
// dengan sampel HTML asli halaman /schedule.
//
// Dijalankan berurutan (bukan Promise.all) supaya tidak buka 7 tab
// Chromium sekaligus -- lebih lambat tapi jauh lebih hemat memori,
// penting di plan hosting kecil.
export async function getSchedule(): Promise<ScheduleItem[]> {
  const results: ScheduleItem[] = [];

  for (const day of DAYS) {
    try {
      const url = `${env.KURAMANIME_URL}/schedule?scheduled_day=${day}`;
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);
      const animeList = parseAnimeCards($, '#animeList');
      results.push({ day: DAY_LABEL_ID[day], animeList });
    } catch (err) {
      logger.warn(`Kuramanime: gagal ambil jadwal hari ${day}: ${(err as Error).message}`);
      results.push({ day: DAY_LABEL_ID[day], animeList: [] });
    }
  }

  return results;
}
