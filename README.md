# Anime API Indonesia (Multi Source: Otakudesu &amp; Samehadaku)

REST API Anime berbahasa Indonesia yang **scraping langsung** dari website sumber (bukan API pihak ketiga, bukan Jikan, bukan Consumet). Dibangun dengan Node.js, Express.js, dan TypeScript, dengan arsitektur Clean Architecture dan sistem **Multi Source Fallback**:

```
Request → Otakudesu → (jika gagal) → Samehadaku → (jika gagal) → Error JSON
```

## Daftar Isi
1. [Fitur](#fitur)
2. [Struktur Project](#struktur-project)
3. [Instalasi di Termux (Android)](#instalasi-di-termux-android)
4. [Menjalankan Project](#menjalankan-project)
5. [Deploy ke Railway](#deploy-ke-railway)
6. [Dokumentasi Endpoint](#dokumentasi-endpoint)
7. [Format Response](#format-response)
8. [Catatan Penting](#catatan-penting)

---

## Fitur

- Scraping langsung dari **Otakudesu** & **Samehadaku** (tanpa API pihak ketiga)
- Sistem **Source Manager** dengan fallback otomatis
- Caching dengan **NodeCache** (TTL berbeda per jenis data)
- Swagger docs di `/docs`
- Keamanan: Helmet, CORS, Rate Limit
- Response terkompresi (gzip) dengan Compression
- Logging request dengan Morgan
- TypeScript strict mode, ESLint, Prettier
- Siap deploy ke Railway (`railway.toml` + `nixpacks.toml`)

## Struktur Project

```
anime-api/
├── src/
│   ├── configs/        # env & cache config
│   ├── controllers/    # handler tiap endpoint
│   ├── routes/         # definisi route express
│   ├── middlewares/     # helmet, rate limit, error handler, 404, asyncHandler
│   ├── helpers/         # axios client, cache manager
│   ├── scrapers/
│   │   ├── otakudesu/   # home, anime, detail, episode, search, download, stream, schedule, genre, movie, completed, ongoing
│   │   └── samehadaku/  # (struktur sama)
│   ├── parsers/         # otakudesu.parser.ts & samehadaku.parser.ts (fungsi parseX terpisah)
│   ├── services/        # sourceManager.service.ts (fallback) & anime.service.ts (cache+fallback)
│   ├── interfaces/       # tipe data & error custom
│   ├── types/
│   ├── utils/            # logger, response builder
│   ├── swagger/          # dokumen openapi
│   ├── app.ts
│   └── server.ts
├── railway.toml
├── nixpacks.toml
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## Instalasi di Termux (Android)

Jalankan perintah berikut secara berurutan di aplikasi **Termux**:

```bash
# 1. Update & upgrade paket Termux
pkg update -y
pkg upgrade -y

# 2. Install Node.js dan Git
pkg install nodejs -y
pkg install git -y
pkg install nano -y

# 3. (opsional) izinkan akses storage HP
termux-setup-storage

# 4. Clone project (ganti URL dengan repo kamu sendiri setelah di-push ke GitHub)
git clone https://github.com/USERNAME/anime-api.git
cd anime-api

# 5. Copy file environment
cp .env.example .env
nano .env   # sesuaikan PORT / URL jika perlu, simpan dengan CTRL+O lalu CTRL+X

# 6. Install dependency
npm install

# 7. Jalankan mode development (auto reload)
npm run dev
```

Jika berhasil, akan muncul log:
```
[INFO] Server berjalan di port 3000 (development)
[INFO] Dokumentasi Swagger tersedia di http://localhost:3000/docs
```

Buka browser HP dan akses `http://localhost:3000/docs`.

## Menjalankan Project

```bash
# Development (ts-node + nodemon, auto reload saat file berubah)
npm run dev

# Build TypeScript -> JavaScript (folder dist/)
npm run build

# Jalankan hasil build (production)
npm start

# Lint & format
npm run lint
npm run lint:fix
npm run format
```

## Deploy ke Railway

1. Push project ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Anime API"
   git branch -M main
   git remote add origin https://github.com/USERNAME/anime-api.git
   git push -u origin main
   ```
2. Buka [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → pilih repo `anime-api`.
3. Railway otomatis mendeteksi `nixpacks.toml` dan `railway.toml`, lalu menjalankan:
   - Build: `npm install && npm run build`
   - Start: `npm start`
4. Tambahkan Environment Variables di tab **Variables** Railway (isi sesuai `.env.example`):
   - `PORT` (Railway biasanya set otomatis, tapi boleh dikosongkan/override)
   - `OTAKUDESU_URL`
   - `SAMEHADAKU_URL`
   - `CACHE_TTL_HOME`, `CACHE_TTL_LIST`, `CACHE_TTL_DETAIL`, `CACHE_TTL_EPISODE`
5. Setelah deploy sukses, akses `https://<nama-project>.up.railway.app/docs`.

---

## Dokumentasi Endpoint

Base URL lokal: `http://localhost:3000`

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/` | Info dasar API |
| GET | `/health` | Cek status server |
| GET | `/docs` | Dokumentasi Swagger |
| GET | `/home` | Data ongoing & completed preview |
| GET | `/ongoing?page=1` | Daftar anime ongoing |
| GET | `/completed?page=1` | Daftar anime completed |
| GET | `/movies?page=1` | Daftar anime movie |
| GET | `/schedule` | Jadwal rilis per hari |
| GET | `/genres` | Daftar semua genre |
| GET | `/genres/:slug?page=1` | Anime berdasarkan genre |
| GET | `/search?q=naruto` | Cari anime |
| GET | `/anime?page=1` | Daftar semua anime (A-Z) |
| GET | `/anime/:id` | Detail anime |
| GET | `/episode/:id` | Detail episode (stream + download) |
| GET | `/stream/:id` | Daftar server streaming |
| GET | `/download/:id` | Daftar link download |
| GET | `/batch/:id` | Link download batch |
| GET | `/recommendation` | Rekomendasi acak |
| GET | `/random` | Satu anime acak |

Contoh:
```bash
curl "http://localhost:3000/search?q=one%20piece"
curl "http://localhost:3000/anime/one-piece-sub-indo"
curl "http://localhost:3000/episode/one-piece-episode-1100-sub-indo"
```

## Format Response

Sukses:
```json
{
  "status": true,
  "message": "Success",
  "source": "Otakudesu",
  "data": {},
  "pagination": { "currentPage": 1, "hasNextPage": true, "hasPrevPage": false }
}
```

Gagal (semua source tidak tersedia):
```json
{
  "status": false,
  "message": "Semua source (Otakudesu & Samehadaku) tidak tersedia",
  "source": "Samehadaku"
}
```

## Catatan Penting

- **Selector HTML bisa berubah sewaktu-waktu.** Otakudesu & Samehadaku sering mengganti tema/struktur HTML mereka. Semua fungsi parser ada di `src/parsers/otakudesu.parser.ts` dan `src/parsers/samehadaku.parser.ts` — jika suatu saat data kosong/salah, cek dan sesuaikan selector CSS di file tersebut dengan struktur HTML terbaru situs sumber (gunakan `view-source` di browser untuk membandingkan).
- Sesuaikan `OTAKUDESU_URL` dan `SAMEHADAKU_URL` di `.env` apabila domain situs sumber berubah.
- Gunakan endpoint `/health` untuk keperluan healthcheck Railway/monitoring.
- Rate limit default: 60 request/menit per IP (bisa diubah lewat `RATE_LIMIT_MAX` & `RATE_LIMIT_WINDOW_MS`).
- Cache tersimpan di memori (NodeCache) — akan reset setiap kali server restart/redeploy.
