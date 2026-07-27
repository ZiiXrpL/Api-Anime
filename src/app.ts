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

const app: Application = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan(env.isProduction() ? 'combined' : 'dev'));
app.use(express.json());
app.use(rateLimiter);

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: true,
    message: 'Anime API Indonesia aktif. Kunjungi /docs untuk dokumentasi Swagger.',
    source: 'None',
    data: {
      docs: '/docs',
      health: '/health',
    },
  });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/', routes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
