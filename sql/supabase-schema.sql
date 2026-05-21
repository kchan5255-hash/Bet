-- 在 Supabase SQL Editor 執行（一次性）
-- 建表 + RLS + Realtime publication

create table if not exists public.odds (
  date       date        not null,
  venue      text        not null,
  race_no    smallint    not null,
  horse_no   smallint    not null,
  win_odds   numeric,
  place_odds numeric,
  updated_at timestamptz not null default now(),
  primary key (date, venue, race_no, horse_no)
);

create table if not exists public.race_meta (
  date        date        not null,
  venue       text        not null,
  race_no     smallint    not null,
  last_update text,
  scraped_at  timestamptz not null default now(),
  primary key (date, venue, race_no)
);

-- RLS：公開讀，寫入交給 service role（service role 會 bypass RLS）
alter table public.odds      enable row level security;
alter table public.race_meta enable row level security;

drop policy if exists "odds read"      on public.odds;
drop policy if exists "race_meta read" on public.race_meta;

create policy "odds read"      on public.odds      for select using (true);
create policy "race_meta read" on public.race_meta for select using (true);

-- Realtime：把兩張表加入 supabase_realtime publication
alter publication supabase_realtime add table public.odds;
alter publication supabase_realtime add table public.race_meta;

-- 讓 UPDATE 事件帶完整 row（不是只有 changed columns）
alter table public.odds      replica identity full;
alter table public.race_meta replica identity full;
