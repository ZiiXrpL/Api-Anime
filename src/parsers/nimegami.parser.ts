import * as cheerio from 'cheerio';
import {
  AnimeCard,
  AnimeDetail,
  DownloadGroup,
  EpisodeItem,
  GenreItem,
  StreamServer,
} from '../interfaces/anime.interface';

function slugFromUrl(url: string | undefined): string {
  if (!url) return '';
  const clean = url.replace(/\/$/, '');
  const parts = clean.split('/');
  return parts[parts.length - 1] ?? '';
}

// Dipakai untuk halaman search (?s=), genre/category, DAN tag (/tag/on-going/,
// /tag/complete/). Ada 2 varian markup buat grid yang sama-sama dipakai theme
// ini:
//   1) search & category: setiap card = <div class="archive-a"> sendiri-sendiri
//      (sibling langsung di dalam <div class="archive">).
//   2) tag archive (ongoing/completed): SATU <div class="archive-a"> membungkus
//      banyak <article> sekaligus, satu <article> = satu card.
// Coba varian 2 dulu (article di dalam archive-a); kalau tidak ada article,
// fallback ke varian 1 (archive-a itu sendiri sebagai card).
export function parseArchiveList(html: string): AnimeCard[] {
  const $ = cheerio.load(html);
  const list: AnimeCard[] = [];

  const articleCards = $('.archive-a article');
  const cards = articleCards.length > 0 ? articleCards : $('.archive-a');

  cards.each((_, el) => {
    const $el = $(el);
    const link = $el.find('.thumbnail a').first();
    const url = link.attr('href') || '';
    const title = $el.find("h2[itemprop='name'] a").first().text().trim();
    if (!title || !url) return;
    const img = $el.find('.thumbnail img').first();
    list.push({
      title,
      slug: slugFromUrl(url),
      poster: img.attr('src') || img.attr('data-src') || '',
      url,
      episode: $el.find('.eps-archive').first().text().trim() || undefined,
      score: $el.find('.rating-archive').first().text().replace(/[^\d.]/g, '').trim() || undefined,
      status: $el.find('.term_tag-a a').first().text().trim() || undefined,
    });
  });
  return list;
}

export function parseGenreList(html: string): GenreItem[] {
  const $ = cheerio.load(html);
  const genres: GenreItem[] = [];
  $('.terms_all a').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    const name = $el.text().replace(/\(\d+\)\s*$/, '').trim();
    if (!name || !href) return;
    genres.push({ name, slug: slugFromUrl(href), url: href });
  });
  return genres;
}

export interface NimegamiEpisodeRaw {
  number: number;
  title: string;
  streams: StreamServer[];
}

export interface NimegamiDetailResult {
  detail: AnimeDetail;
  episodes: NimegamiEpisodeRaw[];
}

export function parseDetail(html: string, animeSlug: string): NimegamiDetailResult {
  const $ = cheerio.load(html);

  const title = $('h1.title').first().text().replace(/^Nonton\s+/i, '').trim();

  const infoRows: Record<string, string> = {};
  $('.info2 table tr').each((_, tr) => {
    const $tr = $(tr);
    const key = $tr.find('td.tablex').text().replace(':', '').trim().toLowerCase();
    const value = $tr.find('td').eq(1).text().trim();
    if (key) infoRows[key] = value;
  });

  const genres: GenreItem[] = [];
  $('.info2 table tr td.info_a a').each((_, a) => {
    const $a = $(a);
    const href = $a.attr('href') || '';
    genres.push({ name: $a.text().trim(), slug: slugFromUrl(href), url: href });
  });

  const synopsis = $('#Sinopsis p')
    .map((_, p) => $(p).text().trim())
    .get()
    .filter((t) => t && !t.startsWith('['))
    .join('\n\n');

  const poster = $('.thumbnail img').first().attr('src') || '';

  const episodeList: EpisodeItem[] = [];
  const episodes: NimegamiEpisodeRaw[] = [];

  $('li.select-eps').each((_, li) => {
    const $li = $(li);
    const epTitle = $li.text().trim();
    const numMatch = epTitle.match(/(\d+)/);
    if (!numMatch) return;
    const number = Number(numMatch[1]);
    const raw = $li.attr('data') || '';
    let streams: StreamServer[] = [];
    if (raw) {
      try {
        const decoded = Buffer.from(raw, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded) as { format: string; url: string[] }[];
        streams = parsed
          .filter((p) => p.url && p.url[0])
          .map((p) => ({ name: 'Nimegami', quality: p.format, url: p.url[0] as string }));
      } catch {
        // data korup/berubah format, skip episode ini
      }
    }
    episodeList.push({
      title: epTitle,
      slug: `nimegami-${animeSlug}--ep-${number}`,
      url: '',
    });
    episodes.push({ number, title: epTitle, streams });
  });

  const detail: AnimeDetail = {
    title,
    slug: animeSlug,
    poster,
    synopsis: synopsis || undefined,
    score: infoRows['rating']?.split('[')[0]?.trim(),
    status: infoRows['status'],
    type: infoRows['type'],
    releaseYear: infoRows['musim / rilis'],
    studio: infoRows['studio'],
    genres,
    episodeList,
  };

  return { detail, episodes };
}

export function parseDownloadForEpisode(html: string, episodeNumber: number): DownloadGroup[] {
  const $ = cheerio.load(html);
  const groups: DownloadGroup[] = [];
  const epHeaderRegex = new RegExp(`Episode\\s+0*${episodeNumber}\\b`, 'i');

  $('.download_box .download h4').each((_, h4) => {
    const $h4 = $(h4);
    if (!epHeaderRegex.test($h4.text())) return;
    $h4.nextUntil('h4', 'ul').find('li').each((__, li) => {
      const $li = $(li);
      const quality = $li.find('strong').first().text().trim() || 'Unknown';
      const links = $li
        .find('a')
        .map((___, a) => ({ provider: $(a).text().trim(), url: $(a).attr('href') || '' }))
        .get()
        .filter((l) => l.url);
      if (links.length) groups.push({ quality, links });
    });
  });

  return groups;
}
