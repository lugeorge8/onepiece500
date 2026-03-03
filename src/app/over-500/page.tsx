import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

type Row = {
  name: string;
  set_code: string | null;
  card_number: string | null;
  rarity: string | null;
  price_usd: string;
  as_of: string;
};

export const dynamic = 'force-dynamic';

export default async function Over500Page() {
  const supabase = getSupabaseAdmin();

  let rows: Row[] = [];
  let err: string | null = null;

  if (!supabase) {
    err = 'Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.';
  } else {
    const { data, error } = await supabase
      .from('card_latest')
      .select('price_usd,as_of,card_id')
      .gte('price_usd', 500)
      .order('price_usd', { ascending: false })
      .limit(200);

    if (error) {
      err = error.message;
    } else {
      const ids = (data ?? []).map((d) => (d as { card_id: number }).card_id);
      if (ids.length) {
        const { data: cards } = await supabase
          .from('cards')
          .select('id,name,set_code,card_number,rarity')
          .in('id', ids);

        type CardRow = {
          id: number;
          name: string;
          set_code: string | null;
          card_number: string | null;
          rarity: string | null;
        };

        const cardById = new Map<number, CardRow>(
          (cards ?? []).map((c) => {
            const row = c as CardRow;
            return [row.id, row];
          })
        );

        rows = (data ?? []).map((d) => {
          const row = d as { card_id: number; price_usd: number; as_of: string };
          const c = cardById.get(row.card_id);
          return {
            name: c?.name ?? '(unknown)',
            set_code: c?.set_code ?? null,
            card_number: c?.card_number ?? null,
            rarity: c?.rarity ?? null,
            price_usd: String(row.price_usd),
            as_of: String(row.as_of),
          };
        });
      }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <main className="mx-auto w-full max-w-5xl px-5 py-12">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
          onepiece500
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Over $500</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Latest price snapshot per card.
        </p>

        {err ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-black/20">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-white/5 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Card</th>
                  <th className="px-4 py-3">Set</th>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Rarity</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">As of</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rows.length ? (
                  rows.map((r) => (
                    <tr key={`${r.name}-${r.as_of}`} className="hover:bg-white/5">
                      <td className="px-4 py-4 font-semibold">{r.name}</td>
                      <td className="px-4 py-4">{r.set_code ?? '—'}</td>
                      <td className="px-4 py-4">{r.card_number ?? '—'}</td>
                      <td className="px-4 py-4">{r.rarity ?? '—'}</td>
                      <td className="px-4 py-4 font-semibold tabular-nums">
                        ${Number(r.price_usd).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-zinc-300">
                        {new Date(r.as_of).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-zinc-400" colSpan={6}>
                      {err ? '—' : 'No cards ≥ $500 (or no data yet).'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
