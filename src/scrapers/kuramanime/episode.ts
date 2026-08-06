import { newPage } from '../../helpers/browserManager';
import { env } from '../../configs/env';
import { logger } from '../../utils/logger';
import { DownloadGroup, EpisodeDetail, StreamServer } from '../../interfaces/anime.interface';

// Skema slug episode Kuramanime: gabungan "{animeId}-{nomorEpisode}", mis.
// "5045-4" untuk anime id 5045 episode 4. Kuramanime pakai ID numerik +
// slug SEO ("/anime/5045/tenkou-saki-.../episode/4"), tapi bagian slug SEO
// itu tidak wajib -- URL cukup "/anime/5045/episode/4" saja sudah valid di
// framework Laravel-nya (routing berdasarkan ID, bukan teks slug).
function parseEpisodeSlug(slug: string): { animeId: string; episodeNumber: string } {
  const match = slug.match(/^(\d+)-(\d+(?:\.\d+)?)$/);
  if (!match) {
    throw new Error(`Format slug episode Kuramanime tidak valid: "${slug}" (harus "{animeId}-{episode}")`);
  }
  return { animeId: match[1], episodeNumber: match[2] };
}

function hrefToEpisodeSlug(href: string | null): string | undefined {
  if (!href) return undefined;
  // href bisa berupa path relatif ("/anime/5045/.../episode/3") atau URL penuh
  const m = href.match(/\/anime\/(\d+)\/[^/]*\/episode\/(\d+(?:\.\d+)?)/) || href.match(/\/anime\/(\d+)\/episode\/(\d+(?:\.\d+)?)/);
  if (!m) return undefined;
  return `${m[1]}-${m[2]}`;
}

interface RawEpisodePageData {
  title: string;
  animeTitle?: string;
  sources: { url: string; quality?: string }[];
  hlsSrc?: string;
  downloadGroups: { quality: string; links: { provider: string; url: string }[] }[];
  prevHref: string | null;
  nextHref: string | null;
  allEpisodeHref: string | null;
  hasVideoError: boolean;
}

export async function getEpisodeDetail(slug: string): Promise<EpisodeDetail> {
  const { animeId, episodeNumber } = parseEpisodeSlug(slug);
  const url = `${env.KURAMANIME_URL}/anime/${animeId}/episode/${episodeNumber}`;

  const page = await newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Tunggu sampai salah satu dari dua hal terjadi: video player berhasil
    // ke-render (lolos verifikasi JS), ATAU area player nunjukin pesan
    // error (gagal lolos / episode memang tidak ada). Dua-duanya berarti
    // AJAX sudah selesai jalan, jadi aman buat mulai baca DOM-nya.
    await page
      .waitForFunction(
        () => {
          const box = document.querySelector('#animeVideoPlayer');
          if (!box) return false;
          if (box.querySelector('video#player')) return true;
          return /terjadi kesalahan/i.test(box.textContent || '');
        },
        { timeout: 25000 },
      )
      .catch(() => {
        // Timeout -- tetap lanjut baca DOM apa adanya, evaluate() di bawah
        // akan menandai hasVideoError kalau memang belum siap.
      });

    const raw: RawEpisodePageData = await page.evaluate(() => {
      const qs = (sel: string) => document.querySelector(sel);
      const qsa = (sel: string) => Array.from(document.querySelectorAll(sel));

      const title = qs('#episodeTitle')?.textContent?.trim() || document.title;

      const breadcrumbLinks = qsa('.breadcrumb__links a[href*="/anime/"]');
      const animeTitle = breadcrumbLinks.length
        ? breadcrumbLinks[breadcrumbLinks.length - 1].textContent?.trim()
        : undefined;

      const videoBox = qs('#animeVideoPlayer');
      const hasVideoError = !!videoBox && /terjadi kesalahan/i.test(videoBox.textContent || '');

      const video = qs('#animeVideoPlayer video#player') as HTMLVideoElement | null;
      const sources: { url: string; quality?: string }[] = [];
      if (video) {
        const mainSrc = video.getAttribute('src');
        video.querySelectorAll('source').forEach((s) => {
          const src = s.getAttribute('src');
          if (src) sources.push({ url: src, quality: s.getAttribute('size') || undefined });
        });
        // Kalau tidak ada <source> sama sekali tapi elemen video punya src
        // langsung, pakai itu sebagai satu-satunya opsi.
        if (sources.length === 0 && mainSrc) {
          sources.push({ url: mainSrc });
        }
      }
      const hlsSrc = video?.getAttribute('data-hls-src') || undefined;

      const downloadGroups: { quality: string; links: { provider: string; url: string }[] }[] = [];
      const downloadRoot = qs('#animeDownloadLink');
      if (downloadRoot) {
        let current: { quality: string; links: { provider: string; url: string }[] } | null = null;
        Array.from(downloadRoot.childNodes).forEach((node) => {
          if (node.nodeType !== 1) return; // hanya elemen
          const el = node as HTMLElement;
          if (el.tagName === 'H6') {
            current = { quality: (el.textContent || '').trim().replace(/\s+/g, ' '), links: [] };
            downloadGroups.push(current);
          } else if (el.tagName === 'A' && current) {
            const href = el.getAttribute('href');
            const label = (el.textContent || '').trim();
            if (href) current.links.push({ provider: label || 'Download', url: href });
          }
        });
      }

      const nav = qs('.episode__navigations');
      const prevHref = nav?.querySelector('.before__nav')?.getAttribute('href') || null;
      const nextHref = nav?.querySelector('.after__nav')?.getAttribute('href') || null;
      const allEpisodeHref = nav?.querySelector('.center__nav')?.getAttribute('href') || null;

      return { title, animeTitle, sources, hlsSrc, downloadGroups, prevHref, nextHref, allEpisodeHref, hasVideoError };
    });

    if (raw.hasVideoError && raw.sources.length === 0) {
      logger.warn(`Kuramanime: video untuk episode "${slug}" gagal diambil (kemungkinan token/fingerprint berubah, atau episode memang tidak tersedia).`);
    }

    const streamServers: StreamServer[] = raw.sources.map((s) => ({
      name: 'Kuramadrive',
      quality: s.quality ? `${s.quality}p` : undefined,
      url: s.url,
    }));

    const downloadList: DownloadGroup[] = raw.downloadGroups.map((g) => ({
      quality: g.quality,
      links: g.links.map((l) => ({ provider: l.provider, url: l.url })),
    }));

    // Anime slug dipakai konsisten "{animeId}" saja (lihat detail.ts) --
    // supaya konsisten dengan skema anime lain di sistem ini.
    const animeSlug = animeId;

    return {
      title: raw.title,
      slug,
      animeSlug,
      streamServers,
      downloadList,
      navigation: {
        prevSlug: hrefToEpisodeSlug(raw.prevHref),
        nextSlug: hrefToEpisodeSlug(raw.nextHref),
        allEpisodeSlug: raw.allEpisodeHref ? animeSlug : undefined,
      },
    };
  } finally {
    await page.close().catch(() => {});
  }
}
