import * as cheerio from 'cheerio';
import {
  AnimeCard,
  AnimeDetail,
  EpisodeDetail,
  EpisodeItem,
  GenreItem,
  HomeData,
  ScheduleItem,
  StreamServer,
} from '../interfaces/anime.interface';

const BASE = 'https://v20.kuramanime.ing';

/**
 * Kuramanime URL形状: /anime/<id>/<slug>[/episode/<no>]
 * Supaya slug tetap satu segmen (aman untuk path param Express), id dan nama
 * digabung dengan '--': <id>--<slug>. Episode: <id>--<slug>--ep-<no>.
 */
export function animeSlugFromUrl(url: string | undefined): string {
  if (!url) return '';
  const m = url.match(/\/anime\/(\d+)\/([^/?#]+)/);
  if (!m) return '';
  return `${m[1]}--${m[2]}`;
}

export function detailPathFromSlug(slug: string): string {
  const clean = decodeURIComponent(slug.trim());
  const m = clean.match(/^(\d+)[-_]{1,2}(.+?)(?:--ep-\d+)?$/);
  if (m) return `/anime/${m[1]}/${m[2]}`;
  if (/^\d+$/.test(clean)) return `/anime/${clean}`;
  // Slug sudah berupa path lengkap / anime URL.
  if (clean.startsWith('/')) return clean;
  if (/^https?:\/\//i.test(clean)) return clean.replace(/^https?:\/\/[^/]+/, '');
  return `/anime/${clean}`;
}

function absoluteUrl(href: string): string {
  if (!href) return '';
  const value = href.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${BASE}${value}`;
  return value;
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Parser kartu anime. Struktur HTML terverifikasi (home, /quick/ongoing,
 * /quick/finished, /anime, /anime?search=...):
 *   <div class="product__item">
 *     <a href="/anime/<id>/<slug>/episode/<n>">
 *       <div class="product__item__pic set-bg" data-setbg="...jpg">
 *         <div class="ep"><span class="actual-anime-<id>-ongoing">Ep 6 / 12</span></div>
 *       </div>
 *       <div class="product__item__text">
 *         <ul><li>TV</li>...</ul>
 *         <h5><a href="...">Judul</a></h5>
 *       </div>
 *     </a>
 *   </div>
 */
export function parseAnimeCards(html: string): AnimeCard[] {
  const $ = cheerio.load(html);
  const list: AnimeCard[] = [];
  const seen = new Set<string>();

  $('.product__item').each((_, el) => {
    const $el = $(el);
    const $title = $el.find('.product__item__text h5 a').first();
    const url = absoluteUrl($title.attr('href') || $el.find('a').first().attr('href') || '');
    const title = cleanText($title.text() || $el.find('.product__item__text h5').text());
    const slug = animeSlugFromUrl(url);
    if (!title || !slug || seen.has(slug)) return;
    seen.add(slug);

    const pic = $el.find('.product__item__pic').first();
    const poster =
      pic.attr('data-setbg') || pic.attr('data-bg') || $el.find('img').first().attr('data-src') || $el.find('img').first().attr('src') || '';

    const epText = cleanText($el.find('.ep').first().text());
    // Di halaman /anime?search=..., `.ep` berisi skor (mis. "6.10"), bukan
    // nomor episode. Jangan menyajikannya sebagai episode.
    const looksLikeScore = /^\d+\.\d{1,2}$/.test(epText);
    const tagText = cleanText($el.find('.product__item__text ul').first().text());
    const isOngoing = $el.find('[class*="-ongoing"]').length > 0 || /ongoing/i.test($el.html() || '');

    list.push({
      title,
      slug,
      poster: absoluteUrl(poster),
      url,
      episode: epText && !looksLikeScore ? epText : undefined,
      score: looksLikeScore ? epText : undefined,
      status: isOngoing ? 'Ongoing' : /selesai|completed/i.test(tagText) ? 'Completed' : undefined,
      type: tagText.split(/\s{2,}|TV|BD|WEB-DL/)[0]?.trim() || undefined,
    });
  });

  return list;
}

export function parseHome(html: string): HomeData {
  const all = parseAnimeCards(html);
  return {
    ongoing: all.filter((a) => a.status === 'Ongoing'),
    // Halaman_home juga berisi anime selesai; kalau tidak ada yang berstatus
    // Completed, pakai separuh kartu terakhir sebagai preview (tetap data asli).
    completed: all.filter((a) => a.status !== 'Ongoing'),
  };
}

export function parseDetail(html: string, slug: string): AnimeDetail {
  const $ = cheerio.load(html);
  const content = $('.anime__details__content').first();
  const scope = content.length ? content : $('body');

  const title = cleanText(scope.find('h3').first().text() || $('h3').first().text() || $('title').first().text().replace(/^\[[^\]]+\]\s*/, '').replace(/\s*-\s*Kuramanime\s*$/i, ''));

  const pic = scope.find('.anime__details__pic').first();
  const poster = absoluteUrl(pic.attr('data-setbg') || scope.find('img').first().attr('src') || $('meta[property="og:image"]').attr('content') || '');

  const scoreText = cleanText(scope.find('.ep').first().text()).replace(/[^\d.]/g, '');
  const synopsisRaw = scope.find('p').filter((_, p) => {
    const t = $(p).text();
    return t.includes('Ditulis oleh') || t.includes('Sinopsis diterjemahkan') || t.length > 120;
  }).first().text();
  const synopsis = cleanText(synopsisRaw.replace(/\[Ditulis oleh[^\]]*\]/gi, '').replace(/Catatan:.*$/i, '').replace(/<br\s*\/?>/gi, ' '));

  // Daftar episode ada di section terpisah dan — pada Kuramanime — href-nya
  // tersimpan di dalam atribut data-content (bukan <a> sungguhan), jadi harus
  // diambil dari HTML mentah juga.
  const episodes: EpisodeItem[] = [];
  const seenEp = new Set<string>();
  const addEpisode = (href: string) => {
    const num = href.match(/\/episode\/(\d+)/)?.[1];
    if (!num || seenEp.has(num)) return;
    seenEp.add(num);
    episodes.push({ title: `Episode ${num}`, slug: `${slug}--ep-${num}`, url: absoluteUrl(href) });
  };
  $('a[href*="/episode/"]').each((_, a) => addEpisode($(a).attr('href') || ''));
  for (const match of html.matchAll(/href=['"]([^'"]*\/episode\/\d+)['"]/g)) {
    addEpisode(match[1]?.replace(/&amp;/g, '&') || '');
  }
  episodes.sort((a, b) => {
    const an = Number(a.slug.match(/ep-(\d+)$/)?.[1] || 0);
    const bn = Number(b.slug.match(/ep-(\d+)$/)?.[1] || 0);
    return an - bn;
  });

  const genres: GenreItem[] = [];
  const seenGenre = new Set<string>();
  scope.find('a[href*="/properties/genre/"]').each((_, a) => {
    const href = absoluteUrl($(a).attr('href') || '');
    const name = cleanText($(a).text());
    const gslug = href.split('/properties/genre/')[1]?.replace(/[/?#].*$/, '') || '';
    if (!name || !gslug || seenGenre.has(gslug)) return;
    seenGenre.add(gslug);
    genres.push({ name, slug: gslug, url: href });
  });

  const infoLinks = scope.find('a').map((_, a) => absoluteUrl($(a).attr('href') || '')).get();
  const status = infoLinks.some((h) => /\/quick\/finished/.test(h))
    ? 'Completed'
    : infoLinks.some((h) => /\/quick\/ongoing/.test(h))
      ? 'Ongoing'
      : undefined;
  const type = infoLinks.find((h) => /\/properties\/type\//.test(h))?.split('/properties/type/')[1]?.replace(/[/?#].*$/, '') || undefined;
  const studios = infoLinks.find((h) => /\/properties\/studio\//.test(h))?.split('/properties/studio/')[1]?.replace(/[/?#].*$/, '') || undefined;

  return {
    title,
    slug,
    poster,
    synopsis: synopsis || undefined,
    score: scoreText || undefined,
    status,
    type: type ? decodeURIComponent(type) : undefined,
    studio: studios ? decodeURIComponent(studios) : undefined,
    genres,
    episodeList: episodes,
  };
}

export function parseEpisodeDetail(html: string, slug: string): EpisodeDetail {
  const $ = cheerio.load(html);
  const scope = $('.anime__details__content').first().length ? $('.anime__details__content').first() : $('body');
  const title = cleanText(scope.find('h3').first().text() || $('title').first().text());

  // Jangan mengira tautan navigasi (discord, shortku, dll.) sebagai server
  // streaming. Hanya terima host yang jelas-jelas player/video; selain itu
  // dikembalikan kosong agar tidak mengarang data.
  const streamServers: StreamServer[] = [];
  const seen = new Set<string>();
  $('a[href*="//"]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const label = cleanText($(a).text()) || 'Server';
    if (!/^https?:\/\//i.test(href)) return;
    if (!/(embed|player|stream|video|watch|vid|m3u8)/i.test(href)) return;
    if (seen.has(href)) return;
    seen.add(href);
    streamServers.push({ name: label.slice(0, 60), url: href });
  });

  return {
    title,
    slug,
    animeSlug: slug.replace(/--ep-\d+$/, ''),
    streamServers,
    downloadList: [],
    navigation: { allEpisodeSlug: slug.replace(/--ep-\d+$/, '') },
  };
}

export function parseGenreList(html: string): GenreItem[] {
  const $ = cheerio.load(html);
  const genres: GenreItem[] = [];
  const seen = new Set<string>();
  $('a[href*="/properties/genre/"]').each((_, a) => {
    const href = absoluteUrl($(a).attr('href') || '');
    const name = cleanText($(a).text());
    const slug = href.split('/properties/genre/')[1]?.replace(/[/?#].*$/, '') || '';
    if (!name || !slug || seen.has(slug)) return;
    seen.add(slug);
    genres.push({ name, slug, url: href });
  });
  return genres;
}

export function parseSchedule(html: string, dayLabel?: string): ScheduleItem[] {
  const $ = cheerio.load(html);
  const cards = parseAnimeCards(html);
  if (!cards.length) return [];
  return [{ day: dayLabel || cleanText($('.schedule-day, .day').first().text()) || 'Lainnya', animeList: cards }];
}
