import puppeteer, { Browser, Page } from 'puppeteer';
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

async function launchBrowser(): Promise<Browser> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

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
