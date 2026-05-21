-- supabase-schema-history.sql
-- 在 Supabase SQL Editor 執行此檔案以建立歷史數據表
-- 執行前請確認 Supabase 專案已連線

-- ============================================================
-- 1. 賽果表：每場每匹馬一行
-- ============================================================
CREATE TABLE IF NOT EXISTS public.race_results (
  id            BIGSERIAL PRIMARY KEY,
  date          DATE        NOT NULL,
  venue         TEXT        NOT NULL,  -- 'ST' | 'HV'
  race_no       INT         NOT NULL,
  class_name    TEXT,
  distance      INT,
  going         TEXT,
  course        TEXT,
  plc           TEXT,                  -- 名次（'1','2','3','WV' 等）
  horse_no      TEXT        NOT NULL,
  horse_name    TEXT,
  horse_code    TEXT,
  jockey        TEXT,
  trainer       TEXT,
  draw          INT,
  actual_weight INT,
  body_weight   INT,
  lbw           TEXT,                  -- 頭馬距離
  running       TEXT,                  -- 沿途走位
  finish_time   TEXT,
  win_odds      NUMERIC,
  scraped_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (date, venue, race_no, horse_no)
);

-- 常用查詢索引
CREATE INDEX IF NOT EXISTS idx_race_results_date       ON public.race_results (date);
CREATE INDEX IF NOT EXISTS idx_race_results_horse_code ON public.race_results (horse_code);
CREATE INDEX IF NOT EXISTS idx_race_results_jockey     ON public.race_results (jockey);
CREATE INDEX IF NOT EXISTS idx_race_results_trainer    ON public.race_results (trainer);

-- RLS：公開讀取，寫入由 service role 管理
ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read race_results"
  ON public.race_results FOR SELECT USING (true);

-- ============================================================
-- 2. 派彩表：每個彩池每個中獎組合一行
-- ============================================================
CREATE TABLE IF NOT EXISTS public.race_dividends (
  id         BIGSERIAL PRIMARY KEY,
  date       DATE        NOT NULL,
  venue      TEXT        NOT NULL,
  race_no    INT         NOT NULL,
  pool       TEXT        NOT NULL,  -- '獨贏','位置','連贏','位置Q','二重彩' 等
  combo      TEXT        NOT NULL,  -- 中獎組合，如 '3', '1-2', '1-2-3'
  dividend   TEXT        NOT NULL,  -- 派彩金額字串，如 '$12.5'
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (date, venue, race_no, pool, combo)
);

CREATE INDEX IF NOT EXISTS idx_race_dividends_date ON public.race_dividends (date);

ALTER TABLE public.race_dividends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read race_dividends"
  ON public.race_dividends FOR SELECT USING (true);

-- ============================================================
-- 3. 馬匹往績表：每匹馬每次出賽一行
-- ============================================================
CREATE TABLE IF NOT EXISTS public.horse_records (
  id          BIGSERIAL PRIMARY KEY,
  horse_code  TEXT        NOT NULL,
  horse_name  TEXT,
  place       TEXT,                  -- 名次
  race_date   DATE,
  track       TEXT,                  -- 場地（ST/HV）
  distance    INT,
  going       TEXT,
  class_no    TEXT,
  draw        TEXT,
  rating      TEXT,
  trainer     TEXT,
  jockey      TEXT,
  lbw         TEXT,
  odds        TEXT,
  act_wt      TEXT,
  body_weight TEXT,
  scraped_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (horse_code, race_date, distance)
);

CREATE INDEX IF NOT EXISTS idx_horse_records_code      ON public.horse_records (horse_code);
CREATE INDEX IF NOT EXISTS idx_horse_records_race_date ON public.horse_records (race_date);
CREATE INDEX IF NOT EXISTS idx_horse_records_jockey    ON public.horse_records (jockey);
CREATE INDEX IF NOT EXISTS idx_horse_records_trainer   ON public.horse_records (trainer);

ALTER TABLE public.horse_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read horse_records"
  ON public.horse_records FOR SELECT USING (true);
