import puppeteer, { Browser, Page } from 'puppeteer';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { logger } from '../utils/logger';

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

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
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

export async function newPage(): Promise<Page> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  );
  await page.setViewport({ width: 1280, height: 800 });
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

export async function fetchHtml(url: string): Promise<string> {
  const page = await newPage();
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});
    const html = await page.content();

    const title = await page.title().catch(() => '(gagal ambil title)');
    logger.info(
      `[DIAGNOSTIK Puppeteer] GET ${url} -> HTTP ${response?.status() ?? '?'}, title="${title}", panjang HTML=${html.length}`,
    );
    if (html.length < 3000) {
      logger.warn(`[DIAGNOSTIK Puppeteer] HTML mencurigakan pendek untuk ${url} -- kemungkinan diblokir/redirect/challenge. Cuplikan: ${html.slice(0, 500)}`);
    }

    return html;
  } finally {
    await page.close().catch(() => {});
  }
}
