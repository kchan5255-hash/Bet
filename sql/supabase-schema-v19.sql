-- supabase-schema-v19.sql
-- V19 模型計算結果表：每場比賽一行
-- 在 Supabase SQL Editor 執行

-- ============================================================
-- v19_predictions：V19 模型輸出
-- 對外只暴露 V19 概念；internal_* 係 V19 內部依賴嘅評分細節
-- ============================================================
CREATE TABLE IF NOT EXISTS public.v19_predictions (
  id              BIGSERIAL    PRIMARY KEY,
  date            DATE         NOT NULL,
  venue           TEXT         NOT NULL,            -- 'ST' | 'HV'
  race_no         INT          NOT NULL,
  mode            TEXT         NOT NULL,            -- 'pre' | 'post'
  race_meta       JSONB,                            -- {distance, className, going, postTime, ...}
  field_size      INT,
  pro_top3        JSONB,                            -- [{no, name, prob}]
  internal_score  NUMERIC,                          -- 內部評分
  internal_tier   TEXT,                             -- 'S' | 'A' | 'B' | null
  internal_reasons JSONB,                           -- ['draw=1','jt-elite',...]
  internal_flags  JSONB,                            -- ['jt-below','j-weak=4.0%',...]
  internal_extra  JSONB,                            -- {jtCombo, jWinRate, tWinRate, draw, class, lastBodyWeight, bodyDelta, stakeMul}
  v19_action      TEXT         NOT NULL,            -- 'play' | 'skip'
  v19_tier        TEXT,                             -- 'S' | 'A' | 'B' | null
  v19_reason      TEXT,                             -- 'bad-distance=1000m' 等
  v19_boost       TEXT,                             -- 'middle' | null
  v19_extra       JSONB,                            -- {v18Tier, v18Score, stakeMul} ─ V19 內部過濾保留嘅 internal 標籤
  recommend       JSONB,                            -- {tier, qinT12, qinBanker, score, stakeMul, boost}
  actual_top3     JSONB,                            -- ['3','7','5'] (賽後才有)
  computed_at     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (date, venue, race_no)
);

-- 常用查詢索引
CREATE INDEX IF NOT EXISTS idx_v19_predictions_date  ON public.v19_predictions (date);
CREATE INDEX IF NOT EXISTS idx_v19_predictions_mode  ON public.v19_predictions (mode);
CREATE INDEX IF NOT EXISTS idx_v19_predictions_play
  ON public.v19_predictions (date)
  WHERE v19_action = 'play';

-- RLS：公開讀取，寫入由 service role 管理
ALTER TABLE public.v19_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read v19_predictions"
  ON public.v19_predictions FOR SELECT USING (true);
