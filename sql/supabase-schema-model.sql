-- supabase-schema-model.sql
-- 模型所需的賽前數據、獸醫記錄、騎師/練馬師統計表
-- 在 Supabase SQL Editor 執行

-- ============================================================
-- 1. 賽前 Race Card 表：每場每匹參賽馬一行（賽前數據）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.race_cards (
  id              BIGSERIAL PRIMARY KEY,
  date            DATE        NOT NULL,
  venue           TEXT        NOT NULL,
  race_no         INT         NOT NULL,
  -- 賽事資訊
  class_name      TEXT,
  distance        INT,
  going           TEXT,
  course          TEXT,
  post_time       TEXT,
  race_name       TEXT,
  -- 馬匹賽前資訊
  horse_no        TEXT        NOT NULL,
  horse_name      TEXT,
  horse_code      TEXT,
  english_name    TEXT,
  draw            INT,
  handicap_weight INT,
  body_weight     INT,
  rating          INT,
  age             INT,
  jockey          TEXT,
  trainer         TEXT,
  last6run        TEXT,         -- "1/7/6/4/8/4"
  gear_info       TEXT,         -- "B/TT"
  status          TEXT,         -- 'Declared' | 'Scratched'
  -- 模型計算結果（可選，後續更新）
  raw_score       NUMERIC,
  model_probability NUMERIC,
  positives       JSONB,
  negatives       JSONB,
  -- 賠率快照（賽前最後一刻）
  win_odds        NUMERIC,
  place_odds      NUMERIC,
  scraped_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (date, venue, race_no, horse_no)
);

CREATE INDEX IF NOT EXISTS idx_race_cards_date       ON public.race_cards (date);
CREATE INDEX IF NOT EXISTS idx_race_cards_horse_code ON public.race_cards (horse_code);
CREATE INDEX IF NOT EXISTS idx_race_cards_jockey     ON public.race_cards (jockey);
CREATE INDEX IF NOT EXISTS idx_race_cards_trainer    ON public.race_cards (trainer);

ALTER TABLE public.race_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read race_cards"
  ON public.race_cards FOR SELECT USING (true);


-- ============================================================
-- 2. 獸醫記錄表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vet_records (
  id          BIGSERIAL PRIMARY KEY,
  date        DATE        NOT NULL,    -- 獸醫記錄發生的賽事日期
  venue       TEXT,
  race_no     INT,
  runner_no   INT,
  horse_code  TEXT,
  horse_name  TEXT,
  detail      TEXT        NOT NULL,
  passed_on   DATE,                    -- 通過日期（解除限制）
  scraped_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (date, venue, race_no, runner_no, detail)
);

CREATE INDEX IF NOT EXISTS idx_vet_records_date       ON public.vet_records (date);
CREATE INDEX IF NOT EXISTS idx_vet_records_horse_code ON public.vet_records (horse_code);

ALTER TABLE public.vet_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read vet_records"
  ON public.vet_records FOR SELECT USING (true);


-- ============================================================
-- 3. 馬匹檔案表（生涯資訊）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.horse_profiles (
  horse_code     TEXT        PRIMARY KEY,
  horse_name     TEXT,
  english_name   TEXT,
  country_origin TEXT,
  age            INT,
  colour         TEXT,
  sex            TEXT,
  sire           TEXT,
  dam            TEXT,
  total_starts   INT,                 -- 總出賽
  wins           INT,
  seconds        INT,
  thirds         INT,
  current_trainer TEXT,
  current_owner   TEXT,
  total_stakes    TEXT,
  raw_profile     JSONB,              -- 原始 profile 全部欄位
  scraped_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.horse_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read horse_profiles"
  ON public.horse_profiles FOR SELECT USING (true);
