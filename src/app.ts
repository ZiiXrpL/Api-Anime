import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import routes from './routes';
import { rateLimiter } from './middlewares/rateLimiter';
import { notFoundHandler } from './middlewares/notFound';
import { globalErrorHandler } from './middlewares/errorHandler';
import { swaggerDocument } from './swagger/swagger';
import { env } from './configs/env';
import { SOURCE_KEYS } from './adapters/types';

const app: Application = express();

// CSP tetap aktif (tidak dimatikan seluruhnya). Swagger UI butuh inline style,
// sedikit inline script dan eval; directive lainnya tetap ketat.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        scriptSrcElem: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(cors());
app.use(compression());
app.use(morgan(env.isProduction() ? 'combined' : 'dev'));
app.use(express.json());
app.use(rateLimiter);

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: true,
    message: 'Anime API Indonesia aktif. Data diambil langsung dari sumber anime publik.',
    configuredSources: SOURCE_KEYS,
    source: SOURCE_KEYS[0],
    data: {
      docs: '/docs',
      health: '/health',
      sources: '/api/sources',
      anime: '/api/anime/home',
      defaultSource: SOURCE_KEYS[0],
      selectSource: '?source=otakudesu|nimegami|kuramanime|samehadaku',
    },
  });
});

app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'Anime API Indonesia — Docs',
    swaggerOptions: { persistAuthorization: true },
  }),
);

app.use('/', routes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
