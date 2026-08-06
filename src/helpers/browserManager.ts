import puppeteer, { Browser, Page } from 'puppeteer';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { logger } from '../utils/logger';

// FIX (dukungan Kuramanime): Kuramanime menaruh link video & unduhan di
// balik verifikasi JavaScript (fingerprint + token, lihat leviathan.js).
// Request HTTP biasa (axios/cheerio, seperti dipakai untuk Otakudesu)
// SELALU ditolak untuk data ini -- sudah dibuktikan langsung, request polos
// ke halaman episode Kuramanime balik dengan pesan error "Terjadi
// kesalahan saat mengambil video". Satu-satunya cara dapat data asli
// adalah menjalankan browser sungguhan (headless) yang mengeksekusi
// JS mereka sampai selesai.
//
// Browser di-reuse (bukan launch baru tiap request) karena launch Chromium
// itu MAHAL (detik, bukan milidetik) -- kalau tiap request launch baru,
// setiap panggilan endpoint episode akan sangat lambat dan gampang
// menghabiskan resource server.

let browserPromise: Promise<Browser> | null = null;
let launchFailureCount = 0;
let resolvedExecutablePath: string | null | undefined; // undefined = belum dicoba resolve

// FIX (error "Browser was not found at the configured executablePath
// (chromium)"): Puppeteer TIDAK mencari executable lewat PATH kayak shell
// biasa -- dia butuh path FILE LENGKAP (absolute path) yang benar-benar
// ada, bukan cuma nama command seperti "chromium". Nixpacks menaruh paket
// Nix (termasuk chromium) di lokasi yang panjang & acak di /nix/store/...,
// jadi path pastinya TIDAK BISA ditebak/di-hardcode di awal -- harus
// dicari saat aplikasi jalan pakai `which`, yang membaca PATH sistem
// container itu sendiri.
function resolveExecutablePath(): string | undefined {
  if (resolvedExecutablePath !== undefined) {
    return resolvedExecutablePath ?? undefined;
  }

  // 1) Kalau PUPPETEER_EXECUTABLE_PATH memang sudah berupa path file yang
  //    valid (bukan cuma nama command), pakai itu apa adanya.
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && existsSync(envPath)) {
    resolvedExecutablePath = envPath;
    logger.info(`Chromium ditemukan lewat PUPPETEER_EXECUTABLE_PATH: ${envPath}`);
    return resolvedExecutablePath;
  }

  // 2) Coba cari lewat `which` untuk beberapa nama command yang umum
  //    dipakai paket Chromium/Chrome di berbagai distro/Nix.
  const candidates = ['chromium', 'chromium-browser', 'google-chrome-stable', 'google-chrome'];
  for (const cmd of candidates) {
    try {
      const found = execSync(`command -v ${cmd}`, { encoding: 'utf-8' }).trim();
      if (found && existsSync(found)) {
        resolvedExecutablePath = found;
        logger.info(`Chromium ditemukan lewat "command -v ${cmd}": ${found}`);
        return resolvedExecutablePath;
      }
    } catch {
      // command tidak ada, coba kandidat berikutnya
    }
  }

  // 3) Tidak ketemu sama sekali -- biarkan undefined supaya Puppeteer pakai
  //    Chromium bawaannya sendiri (kalau ada, hasil download saat install).
  logger.warn('Tidak menemukan Chromium sistem lewat PUPPETEER_EXECUTABLE_PATH maupun `which` -- fallback ke Chromium bawaan Puppeteer (kalau ter-download).');
  resolvedExecutablePath = null;
  return undefined;
}

async function launchBrowser(): Promise<Browser> {
  const executablePath = resolveExecutablePath();

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      // --no-sandbox WAJIB di kontainer Railway (jalan sebagai root, tidak
      // ada sandbox namespace yang didukung) -- tanpa ini Chromium gagal
      // launch sama sekali di banyak platform container.
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // /dev/shm kecil di container, sering bikin Chromium crash
      '--disable-gpu',
      '--single-process', // hemat memori -- penting di plan hosting kecil
      '--no-zygote',
    ],
  });

  browser.on('disconnected', () => {
    logger.warn('Browser Puppeteer terputus -- akan di-launch ulang di request berikutnya.');
    browserPromise = null;
  });

  return browser;
}

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((err) => {
      browserPromise = null;
      launchFailureCount += 1;
      logger.error(`Gagal launch Puppeteer/Chromium (percobaan ke-${launchFailureCount}): ${(err as Error).message}`);
      throw err;
    });
  }
  return browserPromise;
}

// Halaman baru per request (bukan reuse tab), tapi browser-nya di-reuse.
// Selalu tutup page di finally pemanggilnya supaya tidak bocor memori.
export async function newPage(): Promise<Page> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  );
  await page.setViewport({ width: 1280, height: 800 });
  // Blokir gambar/font/media biar lebih cepat & hemat bandwidth -- kita
  // cuma butuh HTML + hasil AJAX-nya, bukan tampilan visualnya.
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    if (type === 'image' || type === 'font' || type === 'media' || type === 'stylesheet') {
      req.abort().catch(() => {});
    } else {
      req.continue().catch(() => {});
    }
  });
  return page;
}

// FIX (masalah "listing/genre/search/detail selalu kosong di server,
// padahal sampel HTML dari browser asli lengkap"): endpoint episode yang
// pakai Puppeteer TERBUKTI berhasil, sementara endpoint lain yang masih
// pakai request HTTP polos (axios/cheerio) selalu kosong. Ini pola khas
// proteksi anti-bot (mis. Cloudflare) yang mengizinkan browser sungguhan
// tapi menahan/mengosongkan konten untuk client non-browser. Solusinya:
// pakai browser sungguhan juga untuk halaman-halaman ini, bukan cuma untuk
// episode. Lebih berat & lambat dari axios biasa, tapi jauh lebih mungkin
// benar-benar dapat konten asli.
export async function fetchHtml(url: string): Promise<string> {
  const page = await newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Kasih sedikit waktu jaga-jaga kalau ada konten yang baru muncul
    // setelah DOM awal siap (mis. proteksi Cloudflare yang butuh beberapa
    // detik sebelum redirect ke halaman asli).
    await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});
    return await page.content();
  } finally {
    await page.close().catch(() => {});
  }
}
