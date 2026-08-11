import axios from 'axios';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0.0.0 Safari/537.36';

interface StordlResolveResponse {
  ok: boolean;
  url?: string;
  error?: string;
}

// Link streaming yang tersimpan di halaman detail Nimegami (base64 di
// li[data]) SEBENARNYA bukan file video langsung, melainkan halaman "player"
// StorDL (mis. https://stordl.halahgan.com/streaming//{code}?name=...).
// Player itu sendiri manggil endpoint JSON di domain yang sama untuk resolve
// URL video final (?action=stream-url&id={code}), dan endpoint itu
// mensyaratkan header Referer persis sama dengan URL player-nya -- makanya
// tidak bisa langsung diputar tanpa lewat resolve step ini dulu.
export async function resolveStordlUrl(playerUrl: string): Promise<string> {
  try {
    const parsed = new URL(playerUrl);
    const id = parsed.pathname.split('/').filter(Boolean).pop();
    if (!id) return playerUrl;

    const apiUrl = `${parsed.origin}${parsed.pathname}?action=stream-url&id=${id}`;

    const { data } = await axios.get<StordlResolveResponse>(apiUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': USER_AGENT,
        Referer: playerUrl,
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    if (data?.ok && data.url) {
      return data.url;
    }
    return playerUrl;
  } catch {
    // Gagal resolve -> kembalikan URL player apa adanya (bukan direct video,
    // tapi setidaknya tombol "Buka di tab baru" di FE masih bisa dipakai)
    // daripada error total.
    return playerUrl;
  }
}

export async function resolveStreamServers<T extends { url: string }>(servers: T[]): Promise<T[]> {
  return Promise.all(servers.map(async (s) => ({ ...s, url: await resolveStordlUrl(s.url) })));
}
