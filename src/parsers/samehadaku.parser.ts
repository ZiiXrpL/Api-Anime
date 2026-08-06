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

export function parseHome(html: string): HomeData {
  const $ = cheerio.load(html);
  const ongoing: AnimeCard[] = [];

  $('.post-show ul li, .listupd .bs').each((_, el) => {
    const $el = $(el);
    const url = $el.find('a').first().attr('href') || '';
    const title = $el.find('h2, .tt').first().text().trim();
    if (!title) return;
    ongoing.push({
      title,
      slug: slugFromUrl(url),
      poster: $el.find('img').attr('src') || $el.find('img').attr('data-src') || '',
      url,
      episode: $el.find('.epx').text().trim() || undefined,
    });
  });

  return { ongoing, completed: [] };
}

export function parseOngoing(html: string): AnimeCard[] {
  const $ = cheerio.load(html);
  const list: AnimeCard[] = [];
  $('.listupd .bs, .relat .bs').each((_, el) => {
    const $el = $(el);
    const url = $el.find('a').first().attr('href') || '';
    const title = $el.find('.tt, h2').first().text().trim();
    if (!title) return;
    list.push({
      title,
      slug: slugFromUrl(url),
      poster: $el.find('img').attr('src') || $el.find('img').attr('data-src') || '',
      url,
      episode: $el.find('.epx').text().trim() || undefined,
      type: $el.find('.typez').text().trim() || undefined,
    });
  });
  return list;
}

export function parseCompleted(html: string): AnimeCard[] {
  return parseOngoing(html);
}

export function parseMovie(html: string): AnimeCard[] {
  const list = parseOngoing(html);
  return list.map((item) => ({ ...item, type: 'Movie' }));
}

export function parseSearch(html: string): AnimeCard[] {
  const $ = cheerio.load(html);
  const list: AnimeCard[] = [];
  $('.listupd .bs, article.bs').each((_, el) => {
    const $el = $(el);
    const url = $el.find('a').first().attr('href') || '';
    const title = $el.find('.tt, h2').first().text().trim();
    if (!title) return;
    list.push({
      title,
      slug: slugFromUrl(url),
      poster: $el.find('img').attr('src') || $el.find('img').attr('data-src') || '',
      url,
      score: $el.find('.numscore').text().trim() || undefined,
      type: $el.find('.typez').text().trim() || undefined,
    });
  });
  return list;
}

export function parseDetail(html: string, slug: string): AnimeDetail {
  const $ = cheerio.load(html);
  const infoRows: Record<string, string> = {};
  $('.infox .spe span, .infotable tr').each((_, el) => {
    const text = $(el).text();
    const [key, ...rest] = text.split(':');
    if (key && rest.length) {
      infoRows[key.trim().toLowerCase()] = rest.join(':').trim();
    }
  });

  const genres: GenreItem[] = [];
  $('.genxx a, .genre-info a').each((_, el) => {
    const href = $(el).attr('href') || '';
    genres.push({ name: $(el).text().trim(), slug: slugFromUrl(href), url: href });
  });

  const episodeList: EpisodeItem[] = [];
  $('.lstepsiode ul li, .episodelist ul li').each((_, el) => {
    const $el = $(el);
    const url = $el.find('a').attr('href') || '';
    const title = $el.find('.epsleft .lchx a, a').first().text().trim();
    if (!title) return;
    episodeList.push({
      title,
      slug: slugFromUrl(url),
      url,
      releaseDate: $el.find('.date').text().trim() || undefined,
    });
  });

  return {
    title: $('.infox h1, h1.entry-title').first().text().trim(),
    slug,
    poster: $('.thumb img, .infoanime img').first().attr('src') || '',
    synopsis: $('.desc, .entry-content p').first().text().trim() || undefined,
    score: infoRows['skor'] || infoRows['score'],
    status: infoRows['status'],
    type: infoRows['tipe'] || infoRows['type'],
    releaseYear: infoRows['dirilis'] || infoRows['tahun'],
    studio: infoRows['studio'],
    genres,
    episodeList,
  };
}

export function parseEpisode(html: string, slug: string): EpisodeDetail {
  const $ = cheerio.load(html);

  const streamServers: StreamServer[] = [];
  $('#server select option, .server_option').each((_, el) => {
    const value = $(el).attr('value') || $(el).attr('data-src') || '';
    const name = $(el).text().trim();
    if (name && value) {
      streamServers.push({ name, url: value });
    }
  });

  const downloadList: DownloadGroup[] = [];
  $('.download-eps ul li, .downloadx ul li').each((_, el) => {
    const $el = $(el);
    const quality = $el.find('strong').first().text().trim() || 'Unknown';
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

  return {
    title: $('.entry-title, h1.entry-title').first().text().trim(),
    slug,
    animeSlug: slugFromUrl($('.nvs a, .lokasieps a').first().attr('href')),
    streamServers,
    downloadList,
    navigation: {
      prevSlug: slugFromUrl($('a.prev, .naveps .nvs.prev a').attr('href')),
      nextSlug: slugFromUrl($('a.next, .naveps .nvs.next a').attr('href')),
      allEpisodeSlug: slugFromUrl($('a.allepz, .naveps .nvs.allepz a').attr('href')),
    },
  };
}

export function parseSchedule(html: string): ScheduleItem[] {
  const $ = cheerio.load(html);
  const result: ScheduleItem[] = [];
  $('.schedulepage .bixbox, .kglist321').each((_, el) => {
    const day = $(el).find('h3, h2').first().text().trim();
    const animeList: AnimeCard[] = [];
    $(el)
      .find('a')
      .each((__, a) => {
        const url = $(a).attr('href') || '';
        const title = $(a).text().trim();
        if (title) animeList.push({ title, slug: slugFromUrl(url), poster: '', url });
      });
    if (day) result.push({ day, animeList });
  });
  return result;
}

export function parseGenreList(html: string): GenreItem[] {
  const $ = cheerio.load(html);
  const genres: GenreItem[] = [];
  $('.genrelist a, .genre a').each((_, el) => {
    const href = $(el).attr('href') || '';
    genres.push({ name: $(el).text().trim(), slug: slugFromUrl(href), url: href });
  });
  return genres;
}

export function parseGenreAnimeList(html: string): AnimeCard[] {
  return parseOngoing(html);
}

/**
 * Parser khusus halaman /daftar-anime-2/ (daftar A-Z). Kemungkinan besar
 * bukan grid card seperti listupd .bs, jadi tidak pakai parseOngoing.
 * Sama seperti versi Otakudesu: ambil semua <a> ke "/anime/...", dedupe by slug,
 * supaya tidak bergantung pada nama class tertentu yang belum terverifikasi.
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
