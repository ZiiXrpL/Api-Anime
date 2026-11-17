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

/** Situs memakai atribut data-embed berisi HTML iframe yang di-escape. */
function firstIframeSrc(value: string): string {
  const decoded = value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');
  const match = decoded.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (match) return match[1];
  return /^https?:\/\//i.test(decoded.trim()) ? decoded.trim() : '';
}

/**
 * Tema baru Samehadaku (/anime-terbaru/, homepage): tiap <li> punya poster
 * episode di .thumb dan judul+URL anime bersih di .dtla h2 a[title].
 */
export function parsePostShow(html: string): AnimeCard[] {
  const $ = cheerio.load(html);
  const list: AnimeCard[] = [];
  const seen = new Set<string>();
  $('.post-show ul li').each((_, el) => {
    const $el = $(el);
    const animeLink = $el.find('.dtla h2 a[href*="/anime/"]').first();
    const href = animeLink.attr('href') || '';
    const slug = slugFromUrl(href);
    if (!href || !slug || seen.has(slug)) return;
    seen.add(slug);
    const title = (animeLink.attr('title') || '').trim() || animeLink.text().replace(/\s+/g, ' ').trim();
    if (!title) return;
    const img = $el.find('.thumb img').first();
    const episodeText = $el.find('.dtla span').first().text().replace(/\s+/g, ' ').trim();
    const epMatch = episodeText.match(/Episode\s*(\d+)/i);
    list.push({
      title,
      slug,
      poster: img.attr('src') || img.attr('data-src') || '',
      url: href,
      ...(epMatch ? { episode: epMatch[1] } : {}),
    });
  });
  return list;
}

export function parseHome(html: string): HomeData {
  const current = parsePostShow(html);
  if (current.length > 0) return { ongoing: current, completed: [] };

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
  const current = parsePostShow(html);
  if (current.length > 0) return current;

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
  const seen = new Set<string>();
  // Tema baru: kartu <article id="post-N"> dengan atribut title bersih.
  $('article[id^="post-"] a[title][href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const title = ($(el).attr('title') || '').trim();
    const slug = slugFromUrl(href);
    if (!/^https?:\/\//.test(href) || !title || !slug || seen.has(slug)) return;
    seen.add(slug);
    const img = $(el).find('img').first();
    list.push({
      title,
      slug,
      poster: img.attr('src') || img.attr('data-src') || '',
      url: href,
    });
  });
  if (list.length > 0) return list;

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
  // Tema baru: pasangan <span label><span nilai> (mis. Status / Studio).
  const knownLabels = ['status', 'studio', 'skor', 'score', 'type', 'tipe', 'dirilis', 'tahun'];
  $('span').each((_, el) => {
    const label = $(el).text().trim().replace(/:$/, '').toLowerCase();
    if (!knownLabels.includes(label)) return;
    const value = $(el).next('span').text().trim();
    if (value && !infoRows[label]) infoRows[label] = value;
  });

  const genres: GenreItem[] = [];
  const seenGenres = new Set<string>();
  $('a[href*="/genre/"]').each((_, el) => {
    const name = $(el).text().trim().replace(/\s+/g, ' ');
    if (!name || seenGenres.has(name.toLowerCase())) return;
    seenGenres.add(name.toLowerCase());
    const href = $(el).attr('href') || '';
    genres.push({ name, slug: slugFromUrl(href), url: href });
  });

  const episodeList: EpisodeItem[] = [];
  const seenEpisodes = new Set<string>();
  // Tema baru: episode adalah post root-level "{judul}-episode-{n}/".
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!/^https?:\/\/[^/]+\/[^/]+-episode-\d+/i.test(href)) return;
    if (/\/batch\//i.test(href)) return;
    const epSlug = slugFromUrl(href);
    if (!epSlug || seenEpisodes.has(epSlug)) return;
    seenEpisodes.add(epSlug);
    const titleAttr = ($(el).attr('title') || '').trim();
    const heading = $(el).find('h3, h4, .title, .lchx').first().text().trim();
    const fallback = epSlug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    episodeList.push({
      title: titleAttr || heading || fallback,
      slug: epSlug,
      url: href,
      releaseDate: $(el).closest('li').find('.date').text().trim() || undefined,
    });
  });
  // Fallback tema lama bila tidak ada pola episode baru.
  if (episodeList.length === 0) {
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
  }

  const ogDescription = ($('meta[property="og:description"]').attr('content') || '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
  return {
    title:
      $('h1[itemprop="headline"]').first().text().trim() ||
      $('.infox h1, h1.entry-title').first().text().trim(),
    slug,
    poster:
      $('meta[property="og:image"]').attr('content') ||
      $('.thumb img, .infoanime img').first().attr('src') ||
      '',
    synopsis: ogDescription || $('.desc, .entry-content p').first().text().trim() || undefined,
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
  // Tema baru: tombol server menyimpan iframe (escape HTML) di data-embed.
  $('.east_player_option.player-server-btn, #server select option, .server_option').each((_, el) => {
    const embed = $(el).attr('data-embed') || $(el).attr('data-src') || $(el).attr('value') || '';
    const url = firstIframeSrc(embed);
    const name = $(el).text().trim() || `Server ${streamServers.length + 1}`;
    if (name && url) {
      streamServers.push({ name, url });
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

  const animeHref = $('.nvs a, .lokasieps a').first().attr('href') || '';
  // Tema baru memakai anchor "#" untuk dropdown; itu BUKAN slug anime.
  // Terima hanya href /anime/...; selain itu turunkan dari slug episode.
  const animeSlugFromLink = animeHref.includes('/anime/') ? slugFromUrl(animeHref) : '';
  const animeSlug = animeSlugFromLink || slug.replace(/-episode-\d+.*$/i, '');

  return {
    title: $('.entry-title, h1.entry-title').first().text().trim(),
    slug,
    animeSlug,
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
  const seen = new Set<string>();
  // Menu genre di header/homepage memakai class Tailwind, jadi seleksi
  // berdasarkan href genres saja (data asli dari situs).
  $('a[href*="/genre/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const slug = slugFromUrl(href);
    const name = $(el).text().trim().replace(/\s+/g, ' ');
    if (!slug || !name || seen.has(slug)) return;
    seen.add(slug);
    genres.push({ name, slug, url: href });
  });
  if (genres.length > 0) return genres;

  $('.genrelist a, .genre a').each((_, el) => {
    const href = $(el).attr('href') || '';
    genres.push({ name: $(el).text().trim(), slug: slugFromUrl(href), url: href });
  });
  return genres;
}

export function parseGenreAnimeList(html: string): AnimeCard[] {
  // Coba dulu grid lama (.listupd .bs / .relat .bs) -> kalau halaman genre
  // kebetulan masih pakai class ini, tidak perlu fallback sama sekali.
  const legacy = parseOngoing(html);
  if (legacy.length > 0) return legacy;

  // FALLBACK: kalau halaman genre Samehadaku dirender pakai wrapper/class
  // yang beda dari .listupd, parseOngoing() di atas balik kosong. Beda
  // dengan Otakudesu, di Samehadaku teks anchor "/anime/..." biasanya
  // BERCAMPUR dengan badge tipe/status (mis. "Judul TV JudulOngoing"),
  // jadi tidak bisa langsung dipakai sebagai judul seperti punya Otakudesu.
  // Judul bersih biasanya ada di heading (h1-h4) terdekat dalam kartu yang
  // sama -> dicari lewat elemen kartu terdekat (article/li), baru fallback
  // ke teks anchor kalau memang tidak ketemu heading.
  return parseGenreArchiveList(html);
}

function parseGenreArchiveList(html: string): AnimeCard[] {
  const $ = cheerio.load(html);
  const list: AnimeCard[] = [];
  const seen = new Set<string>();

  $('a[href*="/anime/"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (!href.includes('/anime/')) return;
    const slug = slugFromUrl(href);
    if (!slug || seen.has(slug)) return;

    // Batasi pencarian judul/poster ke elemen kartu terdekat (article/li),
    // supaya tidak "nyerempet" ambil heading milik kartu anime lain.
    const $card = $el.closest('article, li');
    const $scope = $card.length ? $card : $el.parent();

    const heading = $scope.find('h1, h2, h3, h4').first();
    const headingText = heading.text().trim();
    const anchorText = $el.text().replace(/\s+/g, ' ').trim();
    const title = headingText || anchorText;
    if (!title || /^download$/i.test(title)) return;

    seen.add(slug);

    const img = $scope.find('img').first();
    const poster = img.attr('src') || img.attr('data-src') || '';

    const scopeText = $scope.text();
    const scoreMatch = scopeText.match(/\b\d\.\d{1,2}\b/);
    const typeMatch = scopeText.match(/\b(TV|Movie|OVA|ONA|Special)\b/);

    list.push({
      title,
      slug,
      poster,
      url: href,
      score: scoreMatch ? scoreMatch[0] : undefined,
      type: typeMatch ? typeMatch[0] : undefined,
    });
  });

  return list;
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
    const $card = $el.closest('article, li');
    // Tema baru menyimpan judul bersih di atribut title; teks anchor
    // mengandung badge "TV"/"Completed" dan skor, jadi bukan judul.
    const title =
      ($el.attr('title') || '').trim() ||
      $card.find('.title h2, h2[title], h2').first().text().trim() ||
      $el.text().replace(/\s+/g, ' ').trim();
    if (!slug || !title || seen.has(slug)) return;
    seen.add(slug);
    const img = $card.find('img').first();
    list.push({
      title,
      slug,
      poster: img.attr('src') || img.attr('data-src') || '',
      url: href,
    });
  });

  return list;
}
