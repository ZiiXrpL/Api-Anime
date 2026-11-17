import app from './app';
import { env } from './configs/env';
import { logger } from './utils/logger';

// Vercel mengimpor modul ini sebagai handler (require.main !== module),
// sedangkan `npm start` / nixpacks menjalankannya langsung. Pasang listener
// hanya saat dijalankan langsung agar tidak membuka port di serverless.
if (require.main === module) {
  const server = app.listen(env.PORT, () => {
    logger.info(`Server berjalan di port ${env.PORT} (${env.NODE_ENV})`);
    logger.info(`Dokumentasi Swagger tersedia di http://localhost:${env.PORT}/docs`);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM diterima, mematikan server dengan baik...');
    server.close(() => process.exit(0));
  });
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

// Express app adalah handler (req, res) yang valid untuk runtime Node Vercel.
export const handler = app;
export default app;
