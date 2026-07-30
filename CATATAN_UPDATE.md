# Catatan Update — Perbaikan Module Movie (Film)

## 1. Filter genre/negara/tahun di halaman "Daftar Film" selalu kosong

**Akar masalah:** situs sumber (`sourceA` di `src/configs/movieSources.config.ts`)
TIDAK mendukung filter lewat query string di halaman `/latest`
(`?genre=&country=&year=`) — parameter itu cuma diabaikan situsnya.
Genre/negara/tahun di situs sumber masing-masing punya halaman listing
SENDIRI (`/genre/{slug}`, `/country/{slug}`, `/year/{tahun}`), bukan
lewat query string gabungan di satu halaman.

Sebelumnya, `getAllMoviesController` (di `src/controllers/movie.controller.ts`)
selalu memanggil `movieService.getAllMovies(page, {genre, country, year})`
yang di baliknya cuma nempel semua filter itu sebagai query string ke
`/latest` — jadi APAPUN kombinasi filter yang dipilih user, hasilnya selalu
"tidak ditemukan" karena situsnya tidak pernah benar-benar memfilter apa pun.

**Perbaikan:**
- `movieSources.config.ts` — tambah `countryDetail(slug, page)` dan
  `yearDetail(year, page)`, mengikuti pola `genreDetail` yang sudah ada
  (path asli: `/country/{slug}` dan `/year/{tahun}`).
- `src/scrapers/movie/movieScraper.ts` — tambah `fetchByCountry()` dan
  `fetchByYear()`, mengikuti pola `fetchByGenre()`.
- `src/services/movie.service.ts` — tambah `getByCountry()` dan
  `getByYear()`.
- `src/controllers/movie.controller.ts` — `getAllMoviesController` sekarang
  memilih SATU dimensi utama sesuai prioritas genre > country > year dan
  mengambil dari halaman listing yang memang didukung situsnya. Kalau ada
  dimensi kedua (mis. genre + tahun sekaligus), tahun dicocokkan lagi di
  memori (data kartu film sudah punya field `year`); genre+country
  berbarengan tetap best-effort (situs tidak menyediakan info negara per
  kartu film di halaman listing genre).

Dampaknya juga membetulkan halaman "Genre Film" dan "Negara"/"Tahun" di
Laravel (`FilmController::byCountry`/`byYear`) karena keduanya memanggil
endpoint umum `GET /movies?country=..`/`?year=..` yang sama.

## 2. Poster di halaman detail film rusak + server streaming "menolak untuk terhubung"

**Akar masalah:** dua elemen di halaman DETAIL situs sumber — poster dari
attribute `poster` milik `<video id="videoAd">`, dan `data-url` di
`#player-list a` untuk tiap server streaming — ternyata bisa berupa URL
RELATIF (mis. `/uploads/poster/x.jpg` atau `/embed/xxx`), beda dari kartu
di halaman listing yang sudah absolut. Karena url relatif ini dipakai apa
adanya sebagai `<img src>`/`<iframe src>` di frontend Laravel, browser
pengguna mencoba memuatnya relatif terhadap domain FRONTEND (bukan domain
situs sumber film) — itulah yang menyebabkan ikon gambar rusak di poster
dan pesan "menolak untuk terhubung" saat pilih server streaming.

**Perbaikan:** tambah helper `resolveUrl()` di `src/parsers/movie.parser.ts`
yang menyamakan url relatif (`/xxx`, `//xxx`) jadi url absolut ke
`source.baseURL` situs sumber. Diterapkan ke: poster kartu listing, poster
halaman detail, url tiap server streaming, dan url tiap link download.

**Catatan:** cache di Node (`node-cache`, in-memory) akan hilang otomatis
begitu proses di-restart setelah deploy, jadi tidak perlu tindakan manual
tambahan selain restart service Node-nya (bukan hanya redeploy source-nya
saja kalau proses lama masih berjalan).

---

# Update 2026-07-30 — Situs sumber ganti struktur HTML listing (root cause SEBENARNYA)

Setelah update sebelumnya di-deploy, `/movies` (bahkan tanpa filter sama
sekali) tetap balas 503 "Data kosong dari SourceA". Dari HTML asli
`/latest` yang dikirim user (curl langsung ke situsnya), ketahuan
penyebab sebenarnya: situs sumber (`tv12.lk21official.cc`) mengganti
pembungkus kartu film dari:

```html
<li class="slider"><article>...</article></li>
```

menjadi:

```html
<div class="gallery-grid"><article>...</article></div>
```

Selector lama (`item: 'li.slider article'`) jadi tidak menemukan
apa-apa — makanya SEMUA endpoint yang memakai `parseMovieList`
(`/movies` polos, `/movies/genre/*`, `/movies/country/*`,
`/movies/year/*`, `/movies/search`) selalu dapat 0 hasil, bukan cuma
kombinasi filter seperti dugaan awal. Endpoint `/movies/genre`,
`/movies/country`, `/movies/year` (daftar NAMA genre/negara/tahun,
bukan daftar film) tetap 200 karena pakai selector nav yang berbeda dan
memang tidak berubah.

Elemen lain di dalam kartu (`.poster-title`, `.label` kualitas,
`.rating`, `.year`) dikonfirmasi TIDAK berubah — cuma wrapper-nya saja.

**Perbaikan:** `movieSources.config.ts` — `selectors.list.item` diganti
dari `li.slider article` jadi `.gallery-grid article`.

**Catatan:** halaman genre/country/year/search dan homepage widget
(`.widget[data-type="latest-movies"]`, `.featured`) memakai fungsi
parsing yang SAMA (`parseCardsWithin` + `list.item`), jadi perbaikan
ini otomatis berlaku untuk semuanya. Kalau ternyata bagian "Film" di
HOMEPAGE (halaman `/`, bukan `/latest`) masih kosong setelah update ini
(kemungkinan kecil, kalau homepage-nya pakai template lain), kirim hasil:
```
curl -s -A "Mozilla/5.0" https://tv12.lk21official.cc/ -o ~/home.html
grep -o 'class="[^"]*"' ~/home.html | sort | uniq -c | sort -rn | head -30
```

---

# Update 2026-07-30 (lanjutan) — Search film ternyata AJAX, bukan HTML

Dari file `page/search.js` situs sumber, ketahuan halaman `/search` TIDAK
pernah berisi hasil apa pun di HTML-nya — hasil dimuat belakangan lewat
AJAX ke endpoint JSON di **domain terpisah yang disamarkan**
(`data-search_url` di `<body>` homepage, contoh yang ditemukan:
`https://gudangvape.com/`), memanggil `search.php?s=...&page=...` yang
balas JSON `{ data: [...], totalPages }` dengan field per item: `slug`,
`title` (masih ada suffix "(2024)"), `poster` (path relatif ke
`data-thumbnail_url`), `rating`, `year`, `quality`.

**Perbaikan:**
- `movie.parser.ts` — tambah `parseSearchConfig()` (baca
  `data-search_url`/`data-thumbnail_url` dari homepage) dan
  `parseSearchApiResponse()` (map JSON di atas ke `MovieCard`).
- `movieHttpClient.ts` — tambah `getJson()` untuk panggilan sekali-pakai
  ke url absolut di domain manapun (search API-nya bukan di baseURL utama).
- `movieScraper.ts` — `fetchSearch()` ditulis ulang: ambil homepage dulu
  buat baca `data-search_url` (DIBACA DINAMIS, sengaja tidak di-hardcode,
  supaya kalau domain samaran ini berubah lagi nanti tetap otomatis ikut),
  baru panggil `search.php` di domain itu.

## Streaming tetap "menolak terhubung" — solusi reverse-proxy

Ternyata url server streaming (videonode.de dkk) SUDAH absolut — bukan
soal url relatif seperti dugaan pertama. Providernya memasang header
`Content-Security-Policy: frame-ancestors 'self' *.lk21official.* ...`
yang cuma mengizinkan dirinya di-iframe dari domain keluarga situs asal —
browser akan SELALU menolak menampilkannya lewat `<iframe>` di domain
lain, apapun yang dilakukan di sisi scraping.

Karena user minta videonya tetap tertanam di web sendiri (bukan buka tab
baru), solusinya dipindah ke sisi Laravel: `StreamProxyController`
(`/stream-proxy?url=...`) mengambil video dari server sumber lewat
backend sendiri lalu mengirim ulang ke browser TANPA header CSP/X-Frame-
Options upstream — jadi browser tidak melihat proteksi itu sama sekali.
`js/app.js` (`videoPlayer().iframeUrl`) diarahkan lewat proxy ini.
Best-effort: HTML utama biasanya berhasil, tapi kalau providernya pakai
proteksi tambahan (token per-request, referrer check ketat, resource
terpisah yang tidak ikut ter-rewrite) sebagian masih bisa gagal — link
"buka di tab baru" tetap ada sebagai jalan keluar pasti.
