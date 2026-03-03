export type JustTcgCard = {
  id: string;
  name: string;
  set_name?: string;
  set_code?: string;
  number?: string;
  rarity?: string;
  image_url?: string;
  // price fields vary by provider; we normalize later
  price_cents?: number;
  market_cents?: number;
};

export async function justTcgFetch(path: string) {
  const key = process.env.JUSTTCG_API_KEY;
  if (!key) throw new Error('JUSTTCG_API_KEY not set');

  const url = `https://api.justtcg.com/v1${path}`;
  const res = await fetch(url, {
    headers: {
      'x-api-key': key,
      'user-agent': 'onepiece500/0.1',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`JustTCG ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}
