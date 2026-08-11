import dotenv from 'dotenv';

dotenv.config();

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} wajib diisi`);
  }
  return value;
}

function getEnvNumber(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const env = {
  PORT: getEnvNumber('PORT', 3000),
  NODE_ENV: getEnv('NODE_ENV', 'development'),

  OTAKUDESU_URL: getEnv('OTAKUDESU_URL', 'https://otakudesu.cloud'),
  SAMEHADAKU_URL: getEnv('SAMEHADAKU_URL', 'https://v2.samehadaku.how'),
  NIMEGAMI_URL: getEnv('NIMEGAMI_URL', 'https://nimegami.id'),

  CACHE_TTL_HOME: getEnvNumber('CACHE_TTL_HOME', 600),
  CACHE_TTL_LIST: getEnvNumber('CACHE_TTL_LIST', 1800),
  CACHE_TTL_DETAIL: getEnvNumber('CACHE_TTL_DETAIL', 3600),
  CACHE_TTL_EPISODE: getEnvNumber('CACHE_TTL_EPISODE', 86400),

  RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000),
  RATE_LIMIT_MAX: getEnvNumber('RATE_LIMIT_MAX', 60),

  REQUEST_TIMEOUT_MS: getEnvNumber('REQUEST_TIMEOUT_MS', 15000),

  isProduction: (): boolean => process.env.NODE_ENV === 'production',
};
