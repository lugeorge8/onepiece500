-- onepiece500

create table if not exists public.cards (
  id bigserial primary key,
  external_id text unique, -- OPTCG id or JustTCG id
  name text not null,
  set_code text,
  card_number text,
  rarity text,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.price_snapshots (
  id bigserial primary key,
  card_id bigint not null references public.cards(id) on delete cascade,
  source text not null default 'justtcg',
  price_usd numeric(12,2) not null,
  as_of timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists price_snapshots_card_id_as_of_idx
  on public.price_snapshots(card_id, as_of desc);

-- latest price per card
create view if not exists public.card_latest as
select distinct on (ps.card_id)
  ps.card_id,
  ps.price_usd,
  ps.as_of
from public.price_snapshots ps
order by ps.card_id, ps.as_of desc;
