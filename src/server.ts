import app from './app';
import { env } from './configs/env';
import { logger } from './utils/logger';

const server = app.listen(env.PORT, () => {
  logger.info(`Server berjalan di port ${env.PORT} (${env.NODE_ENV})`);
  logger.info(`Dokumentasi Swagger tersedia di http://localhost:${env.PORT}/docs`);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM diterima, mematikan server dengan baik...');
  server.close(() => process.exit(0));
});
