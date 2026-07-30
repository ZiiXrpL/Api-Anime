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
