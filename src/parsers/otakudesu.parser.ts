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

  $('.rapi').each((_, el) => {
    const section = $(el).closest('.venser').find('h1.jdlrx').text().toLowerCase();
    $(el)
      .find('.venz > ul > li')
      .each((__, item) => {
        const $item = $(item);
        const url = $item.find('h2.jdlflm').parent('a').attr('href') || $item.find('a').attr('href') || '';
        const card: AnimeCard = {
          title: $item.find('h2.jdlflm').text().trim(),
          slug: slugFromUrl(url),
          poster: $item.find('img').attr('src') || '',
          url,
          episode: $item.find('.epz').text().trim() || undefined,
          releaseDay: $item.find('.epztipe').text().trim() || undefined,
        };
        if (card.title) {
          if (section.includes('complete') || section.includes('tamat')) {
            completed.push(card);
          } else {
            ongoing.push(card);
          }
        }
      });
  });

  // fallback selector jika struktur berbeda (tema Otakudesu berubah cukup sering)
  if (ongoing.length === 0 && completed.length === 0) {
    $('.venz > ul > li').each((_, item) => {
      const $item = $(item);
      const url = $item.find('a').attr('href') || '';
      const card: AnimeCard = {
        title: $item.find('h2').text().trim(),
        slug: slugFromUrl(url),
        poster: $item.find('img').attr('src') || '',
        url,
        episode: $item.find('.epz').text().trim() || undefined,
      };
      if (card.title) ongoing.push(card);
    });
  }

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
      status: $item.find('.set').eq(0).text().replace('Status', '').trim() || undefined,
      type: $item.find('.set').eq(1).text().replace('Type', '').trim() || undefined,
      score: $item.find('.set').eq(2).text().replace('Score', '').trim() || undefined,
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
  $('.infozin .genre-info a, .genre-info a').each((_, el) => {
    const href = $(el).attr('href') || '';
    genres.push({
      name: $(el).text().trim(),
      slug: slugFromUrl(href),
      url: href,
    });
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

export function parseEpisode(html: string, slug: string): EpisodeDetail {
  const $ = cheerio.load(html);

  const streamServers: StreamServer[] = [];
  $('#server select option, .mirrorstream select option').each((_, el) => {
    const value = $(el).attr('value') || '';
    const name = $(el).text().trim();
    if (name && value) {
      streamServers.push({ name, url: value });
    }
  });

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

  return {
    title: $('.venutama h1, h1.entry-title').first().text().trim(),
    slug,
    animeSlug: slugFromUrl($('.lokasidownload a, .flir a').first().attr('href')),
    streamServers,
    downloadList,
    navigation: {
      prevSlug: slugFromUrl($('.flir a[title*="Prev"], .flir a.leftx').attr('href')),
      nextSlug: slugFromUrl($('.flir a[title*="Next"], .flir a.rightx').attr('href')),
      allEpisodeSlug: slugFromUrl($('.flir a[title*="List"], .flir a.centerx').attr('href')),
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
