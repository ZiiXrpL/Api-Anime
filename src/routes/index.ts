import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { healthCheck } from '../controllers/health.controller';
import { getHomeController } from '../controllers/home.controller';
import {
  getOngoingController,
  getCompletedController,
  getMoviesController,
} from '../controllers/list.controller';
import { getScheduleController } from '../controllers/schedule.controller';
import { getGenresController, getAnimeByGenreController } from '../controllers/genre.controller';
import { searchController } from '../controllers/search.controller';
import { getAllAnimeController, getAnimeDetailController } from '../controllers/anime.controller';
import {
  getEpisodeController,
  getStreamController,
  getDownloadController,
  getBatchController,
} from '../controllers/episode.controller';
import {
  getRecommendationController,
  getRandomController,
} from '../controllers/discover.controller';
import movieRoutes from './movie.routes';
import { asyncHandler as ah } from '../middlewares/asyncHandler';
import {
  getSourcesController,
  apiHomeController,
  apiOngoingController,
  apiCompletedController,
  apiListController,
  apiSearchController,
  apiDetailController,
  apiEpisodesController,
  apiEpisodeController,
  apiGenresController,
  apiScheduleController,
} from '../controllers/api.controller';

const router = Router();

router.get('/health', healthCheck);

// === API multi-source (kontrak baru, source bisa dipilih via ?source=) ===
router.get('/api/sources', ah(getSourcesController));
router.get('/api/anime/home', ah(apiHomeController));
router.get('/api/anime/ongoing', ah(apiOngoingController));
router.get('/api/anime/completed', ah(apiCompletedController));
router.get('/api/anime/list', ah(apiListController));
router.get('/api/anime/search', ah(apiSearchController));
router.get('/api/anime/genres', ah(apiGenresController));
router.get('/api/anime/schedule', ah(apiScheduleController));
router.get('/api/anime/detail/:slug', ah(apiDetailController));
router.get('/api/anime/episodes/:slug', ah(apiEpisodesController));
router.get('/api/anime/episode/:slug', ah(apiEpisodeController));

// Module Movie (film, bukan anime) di-mount di /movies SEBELUM route anime
// '/movies' di bawah. Catatan penting: Anime lama juga punya
// GET /movies (daftar anime bertipe movie). Karena Express mencocokkan
// route sesuai urutan pendaftaran dan tidak melanjutkan ke handler
// berikutnya begitu satu route merespons, GET /movies sekarang dilayani
// oleh module Movie (film asli), bukan lagi oleh getMoviesController milik
// Anime. Endpoint anime lain TIDAK diubah kodenya sama sekali — hanya path
// bareng '/movies' ini yang kini diprioritaskan untuk module Movie sesuai
// permintaan endpoint baru.
router.use('/movies', movieRoutes);
// Endpoint resmi module Movie versi baru (source: nationalgeoraphic.com,
// tema MUVIPRO) ada di /movie (tunggal) sesuai spesifikasi terbaru:
// /movie, /movie/home, /movie/latest, /movie/popular, /movie/search,
// /movie/detail/:slug, /movie/watch/:slug, /movie/download/:slug,
// /movie/genre, /movie/genre/:slug, /movie/page/:number.
router.use('/movie', movieRoutes);

router.get('/home', asyncHandler(getHomeController));
router.get('/ongoing', asyncHandler(getOngoingController));
router.get('/completed', asyncHandler(getCompletedController));
router.get('/movies', asyncHandler(getMoviesController));
router.get('/schedule', asyncHandler(getScheduleController));

router.get('/genres', asyncHandler(getGenresController));
router.get('/genres/:slug', asyncHandler(getAnimeByGenreController));

router.get('/search', asyncHandler(searchController));

router.get('/anime', asyncHandler(getAllAnimeController));
router.get('/anime/:id', asyncHandler(getAnimeDetailController));

router.get('/episode/:id', asyncHandler(getEpisodeController));
router.get('/stream/:id', asyncHandler(getStreamController));
router.get('/download/:id', asyncHandler(getDownloadController));
router.get('/batch/:id', asyncHandler(getBatchController));

router.get('/recommendation', asyncHandler(getRecommendationController));
router.get('/random', asyncHandler(getRandomController));

export default router;
