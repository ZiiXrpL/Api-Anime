/**
 * Path OpenAPI khusus Movie module. Diimpor dan digabung ke dalam
 * swagger/swagger.ts supaya /docs menampilkan dokumentasi Anime + Movie
 * dalam satu Swagger UI, tanpa perlu menulis ulang struktur Anime.
 */
export const movieSwaggerTag = { name: 'Movie API' };

export const moviePaths = {
  '/movies/home': {
    get: {
      tags: ['Movie API'],
      summary: 'Data halaman utama movie (latest & popular)',
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movies': {
    get: {
      tags: ['Movie API'],
      summary: 'Daftar seluruh movie (bisa difilter genre/country/year)',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'genre', in: 'query', schema: { type: 'string' } },
        { name: 'country', in: 'query', schema: { type: 'string' } },
        { name: 'year', in: 'query', schema: { type: 'string' } },
      ],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movies/search': {
    get: {
      tags: ['Movie API'],
      summary: 'Cari movie berdasarkan judul',
      parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movies/{id}': {
    get: {
      tags: ['Movie API'],
      summary: 'Detail movie berdasarkan slug/id',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movies/genre': {
    get: {
      tags: ['Movie API'],
      summary: 'Daftar semua genre movie',
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movies/genre/{slug}': {
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
  '/movies/country': {
    get: {
      tags: ['Movie API'],
      summary: 'Daftar negara/country movie (dipakai sbg filter di GET /movies)',
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movies/year': {
    get: {
      tags: ['Movie API'],
      summary: 'Daftar tahun rilis movie (dipakai sbg filter di GET /movies)',
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movies/recommendation': {
    get: {
      tags: ['Movie API'],
      summary: 'Rekomendasi movie acak dari data terbaru & populer',
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movies/latest': {
    get: {
      tags: ['Movie API'],
      summary: 'Movie terbaru',
      parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/movies/popular': {
    get: {
      tags: ['Movie API'],
      summary: 'Movie terpopuler',
      parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }],
      responses: { '200': { description: 'OK' } },
    },
  },
};
