#!/usr/bin/env node

// Refresh One Piece card catalog + latest price snapshots using JustTCG → Supabase.
//
// Required env:
// - JUSTTCG_API_KEY
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";

const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!JUSTTCG_API_KEY) throw new Error("JUSTTCG_API_KEY not set");
if (!SUPABASE_URL) throw new Error("SUPABASE_URL not set");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function justtcg(path) {
  const url = `https://api.justtcg.com/v1${path}`;
  const res = await fetch(url, {
    headers: {
      "x-api-key": JUSTTCG_API_KEY,
      "user-agent": "onepiece500/0.1",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`JustTCG ${res.status} ${path}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

function pickArr(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.results)) return json.results;
  return [];
}

function meta(json) {
  return json?._metadata ?? json?.metadata ?? null;
}

async function paginate(pathBuilder, { limit = 200 } = {}) {
  let offset = 0;
  const out = [];

  for (let i = 0; i < 2000; i++) {
    const path = pathBuilder({ limit, offset });
    const json = await justtcg(path);
    const items = pickArr(json);
    out.push(...items);

    const m = meta(json);
    const hasMore = Boolean(m?.has_more ?? m?.hasMore);
    const nextOffset = m?.next_offset ?? m?.nextOffset;

    if (hasMore) {
      offset = typeof nextOffset === "number" ? nextOffset : offset + limit;
      continue;
    }

    // If metadata isn't present, stop after first page.
    if (!m) break;

    break;
  }

  return out;
}

function maxVariantPrice(card) {
  const variants = Array.isArray(card?.variants) ? card.variants : [];
  let best = null;
  for (const v of variants) {
    const p = typeof v?.price === "number" ? v.price : null;
    if (p == null) continue;
    if (!best || p > best.price) best = { price: p, lastUpdated: v?.lastUpdated };
  }
  return best;
}

async function main() {
  const gamesJson = await justtcg("/games");
  const games = pickArr(gamesJson);
  const onepiece = games.find((g) => String(g?.name ?? "").toLowerCase().includes("one piece"));
  if (!onepiece) throw new Error("Could not find One Piece game in /games");
  const gameId = onepiece.id;

  console.log(`Game: ${onepiece.name} (${gameId})`);

  const sets = await paginate(
    ({ limit, offset }) => `/sets?game=${encodeURIComponent(gameId)}&orderBy=release_date&order=asc&limit=${limit}&offset=${offset}`,
    { limit: 200 }
  );

  console.log(`Sets: ${sets.length}`);

  let cardsUpserted = 0;
  let snapshotsInserted = 0;

  for (const s of sets) {
    const setId = s?.id;
    if (!setId) continue;

    const cards = await paginate(
      ({ limit, offset }) =>
        `/cards?game=${encodeURIComponent(gameId)}&set=${encodeURIComponent(setId)}&include_null_prices=true&include_price_history=false&limit=${limit}&offset=${offset}`,
      { limit: 200 }
    );

    if (!cards.length) continue;

    // Upsert cards by external_id
    const upsertPayload = cards
      .map((c) => {
        const external_id = c?.id;
        if (!external_id) return null;
        return {
          external_id,
          name: c?.name ?? "(unknown)",
          set_code: c?.set ?? c?.set_name ?? setId,
          card_number: c?.number ?? null,
          rarity: c?.rarity ?? null,
          image_url: c?.image_url ?? null,
        };
      })
      .filter(Boolean);

    const { data: upserted, error: upsertErr } = await sb
      .from("cards")
      .upsert(upsertPayload, { onConflict: "external_id" })
      .select("id,external_id");

    if (upsertErr) throw new Error(`Supabase upsert cards failed: ${upsertErr.message}`);

    const idByExternal = new Map((upserted ?? []).map((r) => [r.external_id, r.id]));

    const snapPayload = [];
    for (const c of cards) {
      const external_id = c?.id;
      const card_id = external_id ? idByExternal.get(external_id) : null;
      if (!card_id) continue;

      const best = maxVariantPrice(c);
      if (!best || typeof best.price !== "number") continue;

      const as_of =
        typeof best.lastUpdated === "number"
          ? new Date(best.lastUpdated * 1000).toISOString()
          : new Date().toISOString();

      snapPayload.push({ card_id, source: "justtcg", price_usd: best.price, as_of });
    }

    if (snapPayload.length) {
      const { error: snapErr } = await sb.from("price_snapshots").insert(snapPayload);
      if (snapErr) throw new Error(`Supabase insert snapshots failed: ${snapErr.message}`);
    }

    cardsUpserted += upsertPayload.length;
    snapshotsInserted += snapPayload.length;

    console.log(`Set ${setId}: cards=${upsertPayload.length} snapshots=${snapPayload.length}`);
  }

  console.log(`DONE cards_upserted=${cardsUpserted} snapshots_inserted=${snapshotsInserted}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
