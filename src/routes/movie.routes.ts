import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  getMovieListController,
  getMoviePageController,
  getMovieHomeController,
  getMovieLatestController,
  getMoviePopularController,
  searchMovieController,
  getMovieDetailController,
  getMovieWatchController,
  getMovieDownloadController,
  getMovieGenresController,
  getMoviesByGenreController,
} from '../controllers/movie.controller';

const router = Router();

// Route literal (spesifik) WAJIB didaftarkan sebelum route yang punya
// parameter dinamis supaya tidak tertangkap duluan.
router.get('/home', asyncHandler(getMovieHomeController));
router.get('/latest', asyncHandler(getMovieLatestController));
router.get('/popular', asyncHandler(getMoviePopularController));
router.get('/search', asyncHandler(searchMovieController));
router.get('/genre', asyncHandler(getMovieGenresController));
router.get('/genre/:slug', asyncHandler(getMoviesByGenreController));
router.get('/detail/:slug', asyncHandler(getMovieDetailController));
router.get('/watch/:slug', asyncHandler(getMovieWatchController));
router.get('/download/:slug', asyncHandler(getMovieDownloadController));
router.get('/page/:number', asyncHandler(getMoviePageController));

router.get('/', asyncHandler(getMovieListController));

export default router;
