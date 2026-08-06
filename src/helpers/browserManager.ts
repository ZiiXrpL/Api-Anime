import { Browser, Page } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { logger } from '../utils/logger';

puppeteerExtra.use(StealthPlugin());

let browserPromise: Promise<Browser> | null = null;
let launchFailureCount = 0;
let resolvedExecutablePath: string | null | undefined;

function resolveExecutablePath(): string | undefined {
  if (resolvedExecutablePath !== undefined) {
    return resolvedExecutablePath ?? undefined;
  }

  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && existsSync(envPath)) {
    resolvedExecutablePath = envPath;
    logger.info(`Chromium ditemukan lewat PUPPETEER_EXECUTABLE_PATH: ${envPath}`);
    return resolvedExecutablePath;
  }

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
      // coba kandidat berikutnya
    }
  }

  logger.warn('Tidak menemukan Chromium sistem -- fallback ke Chromium bawaan Puppeteer (kalau ter-download).');
  resolvedExecutablePath = null;
  return undefined;
}

async function launchBrowser(): Promise<Browser> {
  const executablePath = resolveExecutablePath();

  const browser = await puppeteerExtra.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
      '--disable-blink-features=AutomationControlled',
    ],
  }) as unknown as Browser;

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

export async function newPage(): Promise<Page> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  );
  await page.setViewport({ width: 1280, height: 800 });
  return page;
}

const CLOUDFLARE_TITLE_MARKERS = ['just a moment', 'attention required', 'checking your browser'];

export async function fetchHtml(url: string): Promise<string> {
  const page = await newPage();
  try {
    let response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    let title = await page.title().catch(() => '');

    let attempt = 0;
    while (CLOUDFLARE_TITLE_MARKERS.some((m) => title.toLowerCase().includes(m)) && attempt < 4) {
      attempt += 1;
      logger.warn(`[Cloudflare] Kena halaman tantangan untuk ${url}, menunggu & coba lagi (percobaan ke-${attempt})...`);
      await new Promise((resolve) => setTimeout(resolve, 4000));
      response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => response);
      title = await page.title().catch(() => '');
    }

    const html = await page.content();

    logger.info(
      `[DIAGNOSTIK Puppeteer] GET ${url} -> HTTP ${response?.status() ?? '?'}, title="${title}", panjang HTML=${html.length}, percobaan=${attempt}`,
    );
    if (html.length < 3000) {
      logger.warn(`[DIAGNOSTIK Puppeteer] HTML mencurigakan pendek untuk ${url} -- kemungkinan masih diblokir/challenge. Cuplikan: ${html.slice(0, 500)}`);
    }

    return html;
  } finally {
    await page.close().catch(() => {});
  }
}
