# Update 2026-08-11 — Perbaikan Module Anime (bukan Movie)

Tiga bug dilaporkan khusus di sisi ANIME (module Movie tidak disentuh sama
sekali di update ini):

## A. Streaming di web loading terus-menerus, tapi jalan kalau dibuka tab baru

**Akar masalah:** persis pola yang sama dengan yang sudah pernah ditemukan
di module Movie (lihat "Streaming tetap menolak terhubung" di bawah) —
server streaming pihak ketiga (embed host di balik Otakudesu/Samehadaku/
Nimegami) memasang header `X-Frame-Options` / `Content-Security-Policy:
frame-ancestors` yang cuma mengizinkan dirinya ditanam di `<iframe>` dari
domain keluarga situs asal. Browser SELALU menolak menampilkannya di
`<iframe>` domain frontend lain — makanya loading terus-menerus, sementara
membuka URL-nya langsung di tab baru (bukan lewat iframe) berhasil.

**Perbaikan:** endpoint baru `GET /stream-proxy?url=...`
(`src/controllers/streamProxy.controller.ts`) mengambil konten streaming
lewat backend sendiri lalu mengirim ulang ke browser TANPA header proteksi
upstream tsb. Response `/episode/:id` dan `/stream/:id` sekarang punya
field baru `embedUrl` di tiap item `streamServers` (selain `url` asli) —
pakai `embedUrl` untuk `<iframe>` di frontend, `url` asli tetap dikirim
sebagai fallback "buka di tab baru" kalau proxy gagal untuk provider
tertentu. Ada proteksi SSRF dasar (tolak target ke localhost/IP privat) di
proxy ini.

## B. Klik hasil search/filter genre kadang menampilkan anime yang salah, dan C. Episode yang tampil tidak sesuai jumlah (mis. "Episode 1–26" tapi cuma tampil 2 episode)

**Akar masalah:** satu penyebab yang sama untuk B dan C.
`src/scrapers/nimegami/detail.ts` (`getAnimeDetail`) punya fallback
"tebak": kalau slug (yang aslinya milik Otakudesu/Samehadaku, bukan
Nimegami) 404 saat dicoba langsung di Nimegami, kode ini mencari anime
LAIN di Nimegami yang judulnya cuma overlap kata >= 60% dan
menganggapnya cocok. Masalahnya, `anime.service.ts` (`getAnimeDetail`)
SELALU mencoba Nimegami LEBIH DULU untuk slug apapun — jadi tebakan yang
cuma 60% mirip ini "menang" duluan sebelum Otakudesu/Samehadaku (yang
sebenarnya punya slug PERSIS cocok) sempat dicoba sama sekali. Akibatnya
anime yang tampil setelah klik hasil search/filter bisa tertukar dengan
anime lain yang judulnya mirip, lengkap dengan jumlah episode milik anime
yang salah itu (bukan anime yang sebenarnya diklik).

**Perbaikan:**
- `scrapers/nimegami/detail.ts` — `getAnimeDetail(slug, allowFuzzyMatch)`
  sekarang punya parameter untuk mematikan fallback tebak-lewat-search di
  atas.
- `services/anime.service.ts` — `getAnimeDetail` sekarang dua tahap: coba
  exact match dulu di Nimegami (`allowFuzzyMatch: false`), Otakudesu,
  Samehadaku secara berurutan; fuzzy-match Nimegami (`allowFuzzyMatch:
  true`) baru dicoba PALING TERAKHIR, hanya kalau ketiga percobaan exact
  di atas semuanya gagal. Endpoint `/episode/:id`, `/stream/:id`,
  `/download/:id` tidak terdampak bug ini (slug episode Nimegami wajib
  berformat `nimegami-{slug}--ep-{n}`, jadi otomatis sudah ter-skip kalau
  slug bukan dari Nimegami).

---

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

---

# Update 2026-07-30 (lanjutan lagi) — Search: fallback karena endpoint asli sengaja diblokir situsnya

Dites berkali-kali beda waktu (12:39, 12:42, 12:43) beda kata kunci
("Doraemon", "Auction" — yang keduanya jelas ADA di katalog situsnya),
tetap 403 terus-menerus di endpoint `search.php` (domain tersamar). Ini
memastikan bukan rate-limit sementara, tapi proteksi yang memang
disengaja oleh situs sumber untuk endpoint itu — di luar kendali kode
scraping manapun tanpa infrastruktur tambahan yang berat (headless
browser, yang juga belum tentu berhasil karena bisa ikut terdeteksi).

**Solusi yang dipilih (paling efektif tanpa nambah beban server):**
`fetchSearch()` di `movieScraper.ts` sekarang:
1. Tetap coba endpoint search.php asli dulu (kalau situsnya sewaktu-waktu
   berhenti memblokir, otomatis langsung pakai ini lagi, tanpa perlu
   update kode).
2. Kalau gagal (403/error apapun), fallback ke `fetchSearchViaListing()`
   — ambil sampai 5 halaman `/latest` (endpoint yang TIDAK diblokir), lalu
   cocokkan judulnya sendiri di kode kita (case-insensitive, substring
   match), maksimal 20 hasil.

**Konsekuensi yang disadari:** hasil pencarian sekarang cuma mencakup
film-film yang ada di beberapa halaman "Film Terbaru" pertama — bukan
seluruh katalog situs. Film lama yang sudah jauh dari halaman pertama
mungkin tidak ketemu walau sebenarnya ada di situs asli. Ini trade-off
yang disengaja: lebih baik sebagian besar kasus umum (search judul yang
lagi ramai/baru) tetap jalan, daripada search selalu gagal total.
