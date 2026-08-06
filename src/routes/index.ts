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

const router = Router();

router.get('/health', healthCheck);

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
