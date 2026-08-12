/**
 * Path OpenAPI khusus Movie module. Diimpor dan digabung ke dalam
 * swagger/swagger.ts supaya /docs menampilkan dokumentasi Anime + Movie
 * dalam satu Swagger UI, tanpa perlu menulis ulang struktur Anime.
 *
 * Source: nationalgeoraphic.com (tema WordPress MUVIPRO).
 */
export const movieSwaggerTag = { name: 'Movie API' };

export const moviePaths = {
  '/movie': {
    get: {
      tags: ['Movie API'],
      summary: 'Daftar movie terbaru (halaman 1)',
      parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movie/page/{number}': {
    get: {
      tags: ['Movie API'],
      summary: 'Daftar movie di halaman tertentu',
      parameters: [{ name: 'number', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movie/home': {
    get: {
      tags: ['Movie API'],
      summary: 'Data halaman utama movie (latest & popular)',
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movie/latest': {
    get: {
      tags: ['Movie API'],
      summary: 'Movie terbaru',
      parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movie/popular': {
    get: {
      tags: ['Movie API'],
      summary: 'Movie terpopuler (sumber tidak punya listing populer terpisah, saat ini sama dengan /movie/latest)',
      parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movie/search': {
    get: {
      tags: ['Movie API'],
      summary: 'Cari movie berdasarkan judul',
      parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movie/detail/{slug}': {
    get: {
      tags: ['Movie API'],
      summary: 'Detail movie (sinopsis, cast, genre, download, daftar server)',
      parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movie/watch/{slug}': {
    get: {
      tags: ['Movie API'],
      summary: 'Resolve URL embed streaming untuk semua server yang tersedia',
      parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movie/download/{slug}': {
    get: {
      tags: ['Movie API'],
      summary: 'Daftar link download movie',
      parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movie/genre': {
    get: {
      tags: ['Movie API'],
      summary: 'Daftar semua genre movie',
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movie/genre/{slug}': {
    get: {
      tags: ['Movie API'],
      summary: 'Daftar movie berdasarkan genre',
      parameters: [
        { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer' } },
      ],
      responses: { '200': { description: 'OK' } },
    },
  },
};
