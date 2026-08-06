import { moviePaths, movieSwaggerTag } from './movie.swagger';

export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Anime API Indonesia',
    version: '1.0.0',
    description:
      'REST API Anime (Otakudesu -> Samehadaku -> Error) + Movie (multi-source, modular via config) hasil scraping langsung, tanpa API pihak ketiga.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Anime API' }, movieSwaggerTag],
  paths: {
    ...moviePaths,
    '/health': {
      get: { summary: 'Cek status kesehatan server', responses: { '200': { description: 'OK' } } },
    },
    '/home': {
      get: { summary: 'Data halaman utama (ongoing & completed preview)', responses: { '200': { description: 'OK' } } },
    },
    '/ongoing': {
      get: {
        summary: 'Daftar anime ongoing',
        parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/completed': {
      get: {
        summary: 'Daftar anime completed',
        parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/movies': {
      get: {
        summary: 'Daftar anime movie',
        parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/schedule': {
      get: { summary: 'Jadwal rilis anime per hari', responses: { '200': { description: 'OK' } } },
    },
    '/genres': {
      get: { summary: 'Daftar semua genre', responses: { '200': { description: 'OK' } } },
    },
    '/genres/{slug}': {
      get: {
        summary: 'Daftar anime berdasarkan genre',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/search': {
      get: {
        summary: 'Cari anime berdasarkan judul',
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/anime': {
      get: {
        summary: 'Daftar seluruh anime (A-Z)',
        parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/anime/{id}': {
      get: {
        summary: 'Detail anime berdasarkan slug',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/episode/{id}': {
      get: {
        summary: 'Detail episode (stream + download) berdasarkan slug',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/stream/{id}': {
      get: {
        summary: 'Daftar server streaming episode',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/download/{id}': {
      get: {
        summary: 'Daftar link download episode',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/batch/{id}': {
      get: {
        summary: 'Daftar link download batch',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/recommendation': {
      get: { summary: 'Rekomendasi anime acak dari data terbaru', responses: { '200': { description: 'OK' } } },
    },
    '/random': {
      get: { summary: 'Satu anime acak', responses: { '200': { description: 'OK' } } },
    },
  },
};
