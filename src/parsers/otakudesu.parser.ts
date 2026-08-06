import * as cheerio from 'cheerio';
import {
  AnimeCard,
  AnimeDetail,
  DownloadGroup,
  EpisodeDetail,
  EpisodeItem,
  GenreItem,
  HomeData,
  ScheduleItem,
  StreamServer,
} from '../interfaces/anime.interface';

function slugFromUrl(url: string | undefined): string {
  if (!url) return '';
  const clean = url.replace(/\/$/, '');
  const parts = clean.split('/');
  return parts[parts.length - 1] ?? '';
}

/**
 * Parse halaman home (ongoing + completed preview) Otakudesu.
 */
export function parseHome(html: string): HomeData {
  const $ = cheerio.load(html);
  const ongoing: AnimeCard[] = [];
  const completed: AnimeCard[] = [];

  $('.venz > ul > li').each((_, item) => {
    const $item = $(item);
    const url = $item.find('h2.jdlflm').parent('a').attr('href') || $item.find('a').attr('href') || '';
    const title = $item.find('h2.jdlflm').text().trim();
    if (!title) return;

    const episodeText = $item.find('.epz').text().trim() || undefined;
    const infoText = $item.find('.epztipe').text().trim();

    // Anime completed ditandai baris kedua berupa skor desimal (contoh: "7.85"),
    // sedangkan ongoing baris keduanya nama hari (contoh: "Senin").
    const isScoreLike = /^\d+(\.\d+)?$/.test(infoText);

    const card: AnimeCard = {
      title,
      slug: slugFromUrl(url),
      poster: $item.find('img').attr('src') || '',
      url,
      episode: episodeText,
    };

    if (isScoreLike) {
      card.score = infoText || undefined;
      completed.push(card);
    } else {
      card.releaseDay = infoText || undefined;
      ongoing.push(card);
    }
  });

  return { ongoing, completed };
}

export function parseOngoing(html: string): AnimeCard[] {
  const $ = cheerio.load(html);
  const list: AnimeCard[] = [];
  $('.venz > ul > li, .detpost').each((_, item) => {
    const $item = $(item);
    const url = $item.find('a').first().attr('href') || '';
    const title = $item.find('h2.jdlflm, .jdlflm, h2').first().text().trim();
    if (!title) return;
    list.push({
      title,
      slug: slugFromUrl(url),
      poster: $item.find('img').attr('src') || '',
      url,
      episode: $item.find('.epz').text().trim() || undefined,
      releaseDay: $item.find('.epztipe').text().trim() || undefined,
    });
  });
  return list;
}

export function parseCompleted(html: string): AnimeCard[] {
  const $ = cheerio.load(html);
  const list: AnimeCard[] = [];
  $('.venz > ul > li, .detpost').each((_, item) => {
    const $item = $(item);
    const url = $item.find('a').first().attr('href') || '';
    const title = $item.find('h2.jdlflm, .jdlflm, h2').first().text().trim();
    if (!title) return;
    list.push({
      title,
      slug: slugFromUrl(url),
      poster: $item.find('img').attr('src') || '',
      url,
      score: $item.find('.epz, .rating').text().trim() || undefined,
    });
  });
  return list;
}

export function parseMovie(html: string): AnimeCard[] {
  const $ = cheerio.load(html);
  const list: AnimeCard[] = [];
  $('.venz > ul > li, .detpost, article').each((_, item) => {
    const $item = $(item);
    const url = $item.find('a').first().attr('href') || '';
    const title = $item.find('h2, .jdlflm').first().text().trim();
    if (!title) return;
    list.push({
      title,
      slug: slugFromUrl(url),
      poster: $item.find('img').attr('src') || '',
      url,
      type: 'Movie',
    });
  });
  return list;
}

export function parseSearch(html: string): AnimeCard[] {
  const $ = cheerio.load(html);
  const list: AnimeCard[] = [];
  $('.chivsrc > li, .venz > ul > li').each((_, item) => {
    const $item = $(item);
    const url = $item.find('a').first().attr('href') || '';
    const title = $item.find('h2').first().text().trim();
    if (!title) return;
    list.push({
      title,
      slug: slugFromUrl(url),
      poster: $item.find('img').attr('src') || '',
      url,
      status: $item.find('.set').eq(1).text().replace(/Status\s*:?/i, '').trim() || undefined,
      score: $item.find('.set').eq(2).text().replace(/Rating\s*:?/i, '').trim() || undefined,
    });
  });
  return list;
}

export function parseDetail(html: string, slug: string): AnimeDetail {
  const $ = cheerio.load(html);
  const infoRows: Record<string, string> = {};
  $('.infozin .infozingle p').each((_, el) => {
    const text = $(el).text();
    const [key, ...rest] = text.split(':');
    if (key && rest.length) {
      infoRows[key.trim().toLowerCase()] = rest.join(':').trim();
    }
  });

  const genres: GenreItem[] = [];
  $('.infozin .infozingle p, .infozingle p').each((_, el) => {
    const $el = $(el);
    const label = $el.text().split(':')[0]?.trim().toLowerCase() || '';
    if (label.includes('genre')) {
      $el.find('a').each((__, a) => {
        const href = $(a).attr('href') || '';
        genres.push({ name: $(a).text().trim(), slug: slugFromUrl(href), url: href });
      });
    }
  });

  const episodeList: EpisodeItem[] = [];
  $('.episodelist ul li, .lstepsiode ul li').each((_, el) => {
    const $el = $(el);
    const url = $el.find('a').attr('href') || '';
    const title = $el.find('a').text().trim() || $el.text().trim();
    if (!title) return;
    episodeList.push({
      title,
      slug: slugFromUrl(url),
      url,
      releaseDate: $el.find('.zeebr').text().trim() || undefined,
    });
  });

  return {
    title: $('.jdlrx h1, h1.entry-title').first().text().replace('Detail Anime', '').trim(),
    slug,
    poster: $('.fotoanime img, .thumb img').first().attr('src') || '',
    synopsis: $('.sinopc').text().trim() || undefined,
    score: infoRows['skor'] || infoRows['score'],
    status: infoRows['status'],
    type: infoRows['tipe'] || infoRows['type'],
    releaseYear: infoRows['tanggal rilis'] || infoRows['tahun'],
    studio: infoRows['studio'],
    genres,
    episodeList,
  };
}

/**
 * Kandidat server mirror streaming Otakudesu.
 * Situs sekarang tidak lagi expose URL video langsung di HTML: tiap <a> mirror
 * punya atribut `data-content` berisi base64 JSON { id, i, q } yang baru bisa
 * diubah jadi URL embed lewat 2 request AJAX ke wp-admin/admin-ajax.php
 * (lihat helpers/otakudesuStreamResolver.ts). Fungsi ini hanya mem-parsing
 * kandidatnya dari HTML, TIDAK melakukan resolve (biar parser tetap sync & pure).
 */
export interface MirrorCandidate {
  provider: string;
  quality: string;
  isDefault: boolean;
  content: { id: number; i: number; q: string };
}

export function parseMirrorCandidates(html: string): MirrorCandidate[] {
  const $ = cheerio.load(html);
  const candidates: MirrorCandidate[] = [];

  $('.mirrorstream ul').each((_, ul) => {
    $(ul)
      .find('li a[data-content]')
      .each((__, a) => {
        const $a = $(a);
        const raw = $a.attr('data-content');
        if (!raw) return;
        try {
          const content = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
          if (!content || typeof content.id === 'undefined') return;
          candidates.push({
            provider: $a.text().trim(),
            quality: content.q || 'Unknown',
            isDefault: $a.attr('data-default') === 'true',
            content,
          });
        } catch {
          // data-content korup/berubah format, skip kandidat ini
        }
      });
  });

  return candidates;
}

export function parseEpisode(html: string, slug: string): EpisodeDetail {
  const $ = cheerio.load(html);

  // Streaming servernya butuh 2 request AJAX tambahan buat resolve URL asli
  // (lihat parseMirrorCandidates di atas), jadi di sini dikosongkan dulu;
  // scraper layer (scrapers/otakudesu/episode.ts) yang akan mengisi field ini
  // setelah resolve kandidat dari parseMirrorCandidates().
  const streamServers: StreamServer[] = [];

  const downloadList: DownloadGroup[] = [];
  $('.download ul li, .downloadxx ul li').each((_, el) => {
    const $el = $(el);
    const quality = $el.find('strong, .quality').first().text().trim() || $el.text().split(':')[0]?.trim() || 'Unknown';
    const links = $el
      .find('a')
      .map((__, a) => ({
        provider: $(a).text().trim(),
        url: $(a).attr('href') || '',
      }))
      .get()
      .filter((l) => l.url);
    if (links.length) {
      downloadList.push({ quality, links });
    }
  });

  // .flir cuma berisi 2 (atau 3) link: "Previous Eps." (title="Episode Sebelumnya"),
  // kadang "Next Eps." (title="Episode Selanjutnya"), dan "See All Episodes" (TANPA
  // title attribute, dikenali dari href yang mengarah ke /anime/).
  let prevHref = '';
  let nextHref = '';
  let allEpisodeHref = '';

  $('.flir a').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    const title = ($el.attr('title') || '').toLowerCase();
    if (href.includes('/anime/')) {
      allEpisodeHref = href;
    } else if (title.includes('sebelumnya') || title.includes('prev')) {
      prevHref = href;
    } else if (title.includes('selanjutnya') || title.includes('berikutnya') || title.includes('next')) {
      nextHref = href;
    }
  });

  return {
    title: $('.venutama h1, h1.entry-title').first().text().trim(),
    slug,
    animeSlug: slugFromUrl(allEpisodeHref),
    streamServers,
    downloadList,
    navigation: {
      prevSlug: slugFromUrl(prevHref),
      nextSlug: slugFromUrl(nextHref),
      allEpisodeSlug: slugFromUrl(allEpisodeHref),
    },
  };
}

export function parseSchedule(html: string): ScheduleItem[] {
  const $ = cheerio.load(html);
  const result: ScheduleItem[] = [];
  $('.kglist321, .kglist').each((_, el) => {
    const day = $(el).find('h2, h3').first().text().trim();
    const animeList: AnimeCard[] = [];
    $(el)
      .find('ul li a')
      .each((__, a) => {
        const url = $(a).attr('href') || '';
        const title = $(a).text().trim();
        if (title) {
          animeList.push({ title, slug: slugFromUrl(url), poster: '', url });
        }
      });
    if (day) result.push({ day, animeList });
  });
  return result;
}

export function parseGenreList(html: string): GenreItem[] {
  const $ = cheerio.load(html);
  const genres: GenreItem[] = [];
  $('.genres a, .genre a').each((_, el) => {
    const href = $(el).attr('href') || '';
    genres.push({ name: $(el).text().trim(), slug: slugFromUrl(href), url: href });
  });
  return genres;
}

export function parseGenreAnimeList(html: string): AnimeCard[] {
  return parseOngoing(html);
}

/**
 * Parser khusus halaman /anime-list/ (daftar A-Z). Halaman ini BUKAN grid card
 * seperti ongoing/completed, melainkan daftar teks polos dikelompokkan per huruf
 * abjad, jadi tidak bisa pakai parseOngoing/parseGenreAnimeList.
 * Pendekatan di sini tidak bergantung pada nama class tertentu (yang rawan
 * berubah): ambil semua <a> yang mengarah ke "/anime/...", dedupe by slug.
 */
export function parseAnimeList(html: string): AnimeCard[] {
  const $ = cheerio.load(html);
  const list: AnimeCard[] = [];
  const seen = new Set<string>();

  $('a[href*="/anime/"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (!href.includes('/anime/')) return;
    const slug = slugFromUrl(href);
    const title = $el.text().trim();
    if (!slug || !title || seen.has(slug)) return;
    seen.add(slug);
    list.push({ title, slug, poster: '', url: href });
  });

  return list;
}
