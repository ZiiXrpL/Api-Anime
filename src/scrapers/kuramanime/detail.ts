import * as cheerio from 'cheerio';
import { kuramanimeClient } from '../../helpers/axiosClient';
import { AnimeDetail, EpisodeItem, GenreItem } from '../../interfaces/anime.interface';

// Ambil isi satu baris widget info (mis. "Tipe:", "Status:", "Studio:")
// dari struktur:
// <li><div class="row"><div class="col-3"><span>Label:</span></div>
//                       <div class="col-9">...isi...</div></div></li>
function widgetValue($: cheerio.CheerioAPI, label: string): string {
  let value = '';
  $('.anime__details__widget li').each((_, li) => {
    const $li = $(li);
    const rowLabel = $li.find('.col-3 span').first().text().trim();
    if (rowLabel.toLowerCase() === label.toLowerCase()) {
      value = $li.find('.col-9').first().text().replace(/\s+/g, ' ').trim();
    }
  });
  return value;
}

function widgetGenres($: cheerio.CheerioAPI, label: string): GenreItem[] {
  const items: GenreItem[] = [];
  $('.anime__details__widget li').each((_, li) => {
    const $li = $(li);
    const rowLabel = $li.find('.col-3 span').first().text().trim();
    if (rowLabel.toLowerCase() !== label.toLowerCase()) return;
    $li.find('.col-9 a').each((__, a) => {
      const $a = $(a);
      const href = $a.attr('href') || '';
      const match = href.match(/\/properties\/genre\/([a-z0-9-]+)/i);
      const name = $a.text().replace(/,\s*$/, '').trim();
      if (match && name) {
        items.push({ name, slug: match[1], url: href });
      }
    });
  });
  return items;
}

export async function getAnimeDetail(animeId: string): Promise<AnimeDetail> {
  const { data: html } = await kuramanimeClient.get(`/anime/${animeId}`);
  const $ = cheerio.load(html);

  const title = $('.anime__details__title h3').first().text().replace(/\s+/g, ' ').trim();
  const poster = $('.anime__details__pic__mobile').first().attr('data-setbg') || '';

  const synopsisHtml = $('#synopsisField').first().html() || '';
  const synopsis = synopsisHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const scoreRaw = widgetValue($, 'Skor:'); // "7.13 / 10.00"
  const score = scoreRaw ? scoreRaw.split('/')[0].trim() : undefined;

  const type = widgetValue($, 'Tipe:') || undefined;
  const status = widgetValue($, 'Status:') || undefined;
  const studio = widgetValue($, 'Studio:') || undefined;

  const tayang = widgetValue($, 'Tayang:'); // "06 Jul 2026 s/d ?"
  const yearMatch = tayang.match(/\b(19|20)\d{2}\b/);
  const releaseYear = yearMatch ? yearMatch[0] : undefined;

  const genres = [
    ...widgetGenres($, 'Genre:'),
    ...widgetGenres($, 'Tema:'),
  ];
  // Hilangkan duplikat kalau ada slug yang sama muncul di kedua baris
  const seenSlug = new Set<string>();
  const dedupedGenres = genres.filter((g) => {
    if (seenSlug.has(g.slug)) return false;
    seenSlug.add(g.slug);
    return true;
  });

  // Daftar episode ternyata disisipkan sebagai HTML mini di dalam atribut
  // data-content milik tombol "Daftar Episode" (dipakai buat popover),
  // BUKAN sebagai elemen halaman biasa -- jadi perlu di-parse ulang sebagai
  // dokumen HTML terpisah.
  const popoverHtml = $('#episodeLists').attr('data-content') || '';
  const episodeList: EpisodeItem[] = [];
  if (popoverHtml) {
    const $$ = cheerio.load(popoverHtml);
    $$('a').each((_, a) => {
      const $a = $$(a);
      const href = $a.attr('href') || '';
      const epMatch = href.match(/\/episode\/(\d+(?:\.\d+)?)/);
      if (!epMatch) return;
      episodeList.push({
        title: `Episode ${epMatch[1]}`,
        slug: `${animeId}-${epMatch[1]}`,
        url: href,
      });
    });
  }

  return {
    title,
    slug: animeId,
    poster,
    synopsis: synopsis || undefined,
    score,
    status,
    type,
    releaseYear,
    studio,
    genres: dedupedGenres,
    episodeList,
  };
}
