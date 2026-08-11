import axios from 'axios';
import { parseDetail } from '../../parsers/nimegami.parser';
import { AnimeCard, AnimeDetail } from '../../interfaces/anime.interface';
import { SourceError } from '../../interfaces/errors.interface';
import { fetchDetailHtml } from './_shared';
import { searchAnime } from './search';

// Slug yang diterima /anime/:id kadang berasal dari LINK LAMA Otakudesu/
// Samehadaku (mis. dari halaman Home/Ongoing yang belum dipindah ke
// Nimegami), jadi bentuknya beda dari slug asli Nimegami dan 404 kalau
// langsung dicoba. Fungsi ini menebak query pencarian dari slug tsb supaya
// masih bisa ditemukan padanannya di Nimegami.
function slugToSearchQuery(slug: string): string {
  return slug
    .replace(/-(sub-indo|subtitle-indonesia|subtitle-indo|batch|bd|ova|ona|movie)$/i, '')
    .replace(/-/g, ' ')
    .trim();
}

function normalizeWords(t: string): string[] {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean);
}

// Slug Otakudesu/Samehadaku sering "memangkas"/menggabung kata dari judul
// asli (mis. "tenkouno" dari "Tenkou-saki no"), jadi dicocokkan pakai RASIO
// kata query yang muncul di judul kandidat -- bukan kesamaan persis.
// Threshold 0.6 dipilih supaya cukup toleran ke pemangkasan tapi tetap
// menolak anime yang jelas beda.
function findBestMatch(query: string, results: AnimeCard[]): AnimeCard | null {
  const queryWords = normalizeWords(query);
  if (queryWords.length === 0) return null;

  let best: AnimeCard | null = null;
  let bestScore = 0;
  for (const r of results) {
    const titleWords = new Set(normalizeWords(r.title));
    const overlap = queryWords.filter((w) => titleWords.has(w)).length;
    const score = overlap / queryWords.length;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return bestScore >= 0.6 ? best : null;
}

// `allowFuzzyMatch` mengontrol apakah fallback tebak-slug-lewat-search di
// bawah boleh dipakai. HARUS false saat dipanggil sebagai percobaan
// PERTAMA di anime.service (getAnimeDetail dicoba Nimegami dulu sebelum
// Otakudesu/Samehadaku): kalau fuzzy match dibolehkan di percobaan
// pertama, slug yang sebenarnya milik Otakudesu/Samehadaku (dan API PASTI
// punya data cocok-persis di sana) malah "keburu" dijawab pakai anime lain
// di Nimegami yang cuma mirip judulnya (skor overlap kata >= 0.6 dianggap
// cukup), sebelum Otakudesu/Samehadaku sempat dicoba sama sekali. Ini
// menyebabkan anime yang salah ikut tampil setelah user search/filter lalu
// klik, dan jumlah episode yang tampil ikut salah (episode milik anime
// yang salah, bukan yang diklik). `allowFuzzyMatch: true` hanya boleh
// dipakai sebagai UPAYA TERAKHIR setelah Nimegami exact, Otakudesu, dan
// Samehadaku semuanya gagal -- supaya link lama yang memang cuma ada di
// Nimegami lewat slug non-native masih bisa ketemu, tanpa membajak slug
// yang harusnya dijawab exact oleh source lain.
export async function getAnimeDetail(slug: string, allowFuzzyMatch = true): Promise<AnimeDetail> {
  try {
    let html: string;
    let resolvedSlug = slug;

    try {
      html = await fetchDetailHtml(slug);
    } catch (err) {
      if (allowFuzzyMatch && axios.isAxiosError(err) && err.response?.status === 404) {
        const query = slugToSearchQuery(slug);
        const results = await searchAnime(query);
        const match = findBestMatch(query, results);
        if (!match) throw err;
        resolvedSlug = match.slug;
        html = await fetchDetailHtml(resolvedSlug);
      } else {
        throw err;
      }
    }

    const { detail } = parseDetail(html, resolvedSlug);
    return detail;
  } catch (error) {
    throw new SourceError('Nimegami', `Gagal mengambil detail anime "${slug}": ${(error as Error).message}`);
  }
}
