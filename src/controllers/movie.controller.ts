import { Request, Response } from 'express';
import { movieService } from '../services/movie.service';
import { sendSuccess, sendError } from '../utils/responseBuilder';
import {
  parseMovieListQuery,
  parsePageQuery,
  validateSearchQuery,
  validateSlugParam,
} from '../schemas/movie.schema';

export async function getMovieHomeController(_req: Request, res: Response): Promise<void> {
  const result = await movieService.getHome();
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getAllMoviesController(req: Request, res: Response): Promise<void> {
  const { page, genre, country, year } = parseMovieListQuery(req.query as Record<string, unknown>);

  // FIX (masalah "filter genre/negara/tahun selalu kosong"): situs sumber
  // TIDAK mendukung filter lewat query string di /latest
  // (?genre=&country=&year=) — parameter itu diabaikan begitu saja,
  // sementara genre/negara/tahun di situs asli masing-masing punya
  // halaman listing SENDIRI (/genre/{slug}, /country/{slug}, /year/{y}).
  // Sebelumnya combined filter ini selalu diteruskan ke /latest?... yang
  // pasti tidak cocok apa pun -> hasil selalu kosong.
  //
  // Sekarang: pilih SATU dimensi utama (prioritas genre > country > year)
  // dan ambil dari halaman listing yang memang didukung situsnya. Kalau
  // ada dimensi lain yang ikut di-set bersamaan, "year" masih bisa
  // dicocokkan lagi di memori (card film sudah punya field year), tapi
  // genre/country tidak (situs tidak menyediakan info itu per-card di
  // halaman listing), jadi tetap best-effort untuk kombinasi genre+country.
  let result: { source: string; data: import('../interfaces/movie.interface').MovieCard[] };

  if (genre) {
    result = await movieService.getByGenre(genre, page);
  } else if (country) {
    result = await movieService.getByCountry(country, page);
  } else if (year) {
    result = await movieService.getByYear(year, page);
  } else {
    result = await movieService.getAllMovies(page);
  }

  // Cocokkan lagi by year kalau year di-set BERSAMA dimensi lain (genre
  // atau country jadi dimensi utama di atas, year jadi filter tambahan).
  if (year && (genre || country)) {
    result = { ...result, data: result.data.filter((m) => (m.year || '').includes(year)) };
  }

  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function searchMovieController(req: Request, res: Response): Promise<void> {
  const { valid, query, error } = validateSearchQuery(req.query.q);
  if (!valid) {
    sendError(res, { message: error as string, statusCode: 400 });
    return;
  }
  const result = await movieService.search(query);
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getMovieDetailController(req: Request, res: Response): Promise<void> {
  const { valid, slug: id, error } = validateSlugParam(req.params.id, 'id');
  if (!valid) {
    sendError(res, { message: error as string, statusCode: 400 });
    return;
  }
  const result = await movieService.getDetail(id);
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getMovieGenresController(_req: Request, res: Response): Promise<void> {
  const result = await movieService.getGenreList();
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getMoviesByGenreController(req: Request, res: Response): Promise<void> {
  const { valid, slug, error } = validateSlugParam(req.params.slug, 'slug');
  if (!valid) {
    sendError(res, { message: error as string, statusCode: 400 });
    return;
  }
  const page = parsePageQuery(req.query.page);
  const result = await movieService.getByGenre(slug, page);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function getMovieCountriesController(_req: Request, res: Response): Promise<void> {
  const result = await movieService.getCountryList();
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getMovieYearsController(_req: Request, res: Response): Promise<void> {
  const result = await movieService.getYearList();
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getMovieRecommendationController(_req: Request, res: Response): Promise<void> {
  const result = await movieService.getRecommendation();
  sendSuccess(res, { source: result.source, data: result.data });
}

export async function getLatestMoviesController(req: Request, res: Response): Promise<void> {
  const page = parsePageQuery(req.query.page);
  const result = await movieService.getLatest(page);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}

export async function getPopularMoviesController(req: Request, res: Response): Promise<void> {
  const page = parsePageQuery(req.query.page);
  const result = await movieService.getPopular(page);
  sendSuccess(res, {
    source: result.source,
    data: result.data,
    pagination: { currentPage: page, hasNextPage: result.data.length > 0, hasPrevPage: page > 1 },
  });
}
