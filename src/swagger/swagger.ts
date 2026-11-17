import { moviePaths, movieSwaggerTag } from './movie.swagger';

const sourceParam = {
  name: 'source',
  in: 'query',
  required: false,
  description: 'Sumber anime: otakudesu | nimegami | kuramanime | samehadaku. Kosong = fallback otomatis.',
  schema: { type: 'string', enum: ['otakudesu', 'nimegami', 'kuramanime', 'samehadaku'] },
};

const pageParam = { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1 } };
const jsonOk = {
  description: 'Respons JSON valid',
  content: {
    'application/json': {
      example: { status: true, message: 'Success', source: 'otakudesu', total: 1, data: [] },
    },
  },
};
const jsonError = {
  description: 'Gagal mengambil data',
  content: {
    'application/json': {
      example: { status: false, message: 'Semua sumber gagal', source: 'otakudesu', error: { code: 'ALL_SOURCES_FAILED' } },
    },
  },
};
const responses = { '200': jsonOk, '400': jsonError, '502': jsonError, '503': jsonError };

const apiPaths = {
  '/api/sources': {
    get: {
      summary: 'Monitoring actual availability ketiga sumber (+ samehadaku)',
      description: 'Mengirim HEAD/GET nyata ke tiap source, mengembalikan responseTime dan lastChecked.',
      tags: ['Sources'],
      parameters: [{ name: 'refresh', in: 'query', required: false, schema: { type: 'boolean' } }],
      responses,
    },
  },
  '/api/anime/home': { get: { summary: 'Home (ongoing + completed)', tags: ['Anime Multi-Source'], parameters: [sourceParam], responses } },
  '/api/anime/ongoing': { get: { summary: 'Daftar ongoing', tags: ['Anime Multi-Source'], parameters: [sourceParam, pageParam], responses } },
  '/api/anime/completed': { get: { summary: 'Daftar completed', tags: ['Anime Multi-Source'], parameters: [sourceParam, pageParam], responses } },
  '/api/anime/list': { get: { summary: 'Daftar seluruh anime', tags: ['Anime Multi-Source'], parameters: [sourceParam, pageParam], responses } },
  '/api/anime/search': {
    get: {
      summary: 'Cari anime',
      tags: ['Anime Multi-Source'],
      parameters: [sourceParam, { name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
      responses,
    },
  },
  '/api/anime/genres': { get: { summary: 'Daftar genre', tags: ['Anime Multi-Source'], parameters: [sourceParam], responses } },
  '/api/anime/schedule': { get: { summary: 'Jadwal rilis', tags: ['Anime Multi-Source'], parameters: [sourceParam], responses } },
  '/api/anime/detail/{slug}': {
    get: {
      summary: 'Detail anime',
      tags: ['Anime Multi-Source'],
      parameters: [sourceParam, { name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses,
    },
  },
  '/api/anime/episodes/{slug}': {
    get: {
      summary: 'Daftar episode anime',
      tags: ['Anime Multi-Source'],
      parameters: [sourceParam, { name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses,
    },
  },
  '/api/anime/episode/{slug}': {
    get: {
      summary: 'Detail satu episode',
      tags: ['Anime Multi-Source'],
      parameters: [sourceParam, { name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses,
    },
  },
};

export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Anime API Indonesia',
    version: '1.1.0',
    description:
      'REST API multi-source (Otakudesu, Nimegami, Kuramanime, Samehadaku) hasil scraping metadata publik. Pilih sumber via ?source=, fallback otomatis bila gagal.',
  },
  servers: [
    { url: 'https://api-anime-brown.vercel.app', description: 'Production' },
    { url: '/', description: 'Local' },
  ],
  tags: [{ name: 'Anime API' }, { name: 'Anime Multi-Source' }, { name: 'Sources' }, movieSwaggerTag],
  paths: {
    ...apiPaths,
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
