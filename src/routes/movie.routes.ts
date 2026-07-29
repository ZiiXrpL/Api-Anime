import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  getMovieHomeController,
  getAllMoviesController,
  searchMovieController,
  getMovieDetailController,
  getMovieGenresController,
  getMoviesByGenreController,
  getMovieCountriesController,
  getMovieYearsController,
  getMovieRecommendationController,
  getLatestMoviesController,
  getPopularMoviesController,
} from '../controllers/movie.controller';

const router = Router();

// Route literal (spesifik) WAJIB didaftarkan sebelum '/:id' supaya tidak
// tertangkap wildcard-nya.
router.get('/home', asyncHandler(getMovieHomeController));
router.get('/search', asyncHandler(searchMovieController));
router.get('/genre', asyncHandler(getMovieGenresController));
router.get('/genre/:slug', asyncHandler(getMoviesByGenreController));
router.get('/country', asyncHandler(getMovieCountriesController));
router.get('/year', asyncHandler(getMovieYearsController));
router.get('/recommendation', asyncHandler(getMovieRecommendationController));
router.get('/latest', asyncHandler(getLatestMoviesController));
router.get('/popular', asyncHandler(getPopularMoviesController));

router.get('/', asyncHandler(getAllMoviesController));
router.get('/:id', asyncHandler(getMovieDetailController));

export default router;
