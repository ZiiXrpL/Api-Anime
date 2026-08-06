import { CheerioAPI } from 'cheerio';
import { AnimeCard } from '../../interfaces/anime.interface';

// Semua halaman grid Kuramanime (beranda, ongoing, selesai, movie, genre,
// pencarian) pakai markup kartu yang SAMA persis:
//
// <a href="https://v9.kuramanime.work/anime/{id}/{slug-seo}[/episode/{n}]">
//   <div class="product__sidebar__view__item set-bg" data-setbg="POSTER_URL">
//     <div class="ep">Ep 5 / 12</div>  <!-- ongoing --> ATAU
//     <div class="ep"><i class="fa fa-star"></i> 8.70</div>  <!-- selesai/movie -->
//     <div class="view">HD</div>  <!-- kualitas/tipe -->
//     <div class="d-none"><span>SELESAI</span></div>  <!-- status -->
//     <h5 class="sidebar-title-h5 px-2 py-2">Judul Anime</h5>
//   </div>
// </a>
//
// Slug yang dipakai di seluruh sistem ini = ID numerik Kuramanime saja
// (mis. "5045"), TANPA bagian teks SEO -- karena URL "/anime/{id}" saja
// sudah valid & di-redirect/diterima oleh routing Kuramanime yang berbasis
// ID, dan ini jauh lebih stabil daripada ikut menyimpan teks judul yang
// berpotensi berubah sewaktu-waktu.
export function parseAnimeCards($: CheerioAPI, root: string): AnimeCard[] {
  const cards: AnimeCard[] = [];

  $(root)
    .find('a[href*="/anime/"]')
    .each((_, el) => {
      const $a = $(el);
      const href = $a.attr('href') || '';
      const idMatch = href.match(/\/anime\/(\d+)/);
      if (!idMatch) return;
      const slug = idMatch[1];

      const $item = $a.find('.product__sidebar__view__item').first();
      if ($item.length === 0) return;

      const poster = $item.attr('data-setbg') || '';
      const title = $item.find('h5.sidebar-title-h5').first().text().trim();
      if (!title) return;

      const epText = $item.find('.ep').first().text().replace(/\s+/g, ' ').trim();
      const isEpisodeCount = /^Ep\s/i.test(epText);

      const view = $item.find('.view').first().text().trim(); // "HD" / "BD" / "WEB-DL" dst
      const status = $item.find('.d-none span').first().text().trim() || undefined;

      cards.push({
        title,
        slug,
        poster,
        url: href,
        episode: isEpisodeCount ? epText.replace(/^Ep\s*/i, '') : undefined,
        score: !isEpisodeCount && epText ? epText.replace(/[^\d.]/g, '') : undefined,
        status,
        type: view || undefined,
      });
    });

  return cards;
}

// Dipakai untuk baca link "halaman berikutnya ada / tidak" dari pagination
// Kuramanime (".product__pagination"), dipakai getOngoing/getCompleted/dst
// untuk tahu apakah page+1 masih ada datanya.
export function hasNextPage($: CheerioAPI): boolean {
  const nextLink = $('.product__pagination a.page__link').filter((_, el) => {
    return /angle-right/.test($(el).html() || '');
  });
  return nextLink.length > 0;
}
