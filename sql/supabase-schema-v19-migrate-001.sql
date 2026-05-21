-- supabase-schema-v19-migrate-001.sql
-- 重建 v19_predictions：column 改名（v18_xxx → internal_xxx）+ 加 internal_extra
-- ⚠ 此操作會 DROP 既有 v19_predictions table
-- 跑完後再執行 migrate-backtest-to-supabase.js 重新灌入 1944 row

DROP TABLE IF EXISTS public.v19_predictions;

CREATE TABLE public.v19_predictions (
  id              BIGSERIAL    PRIMARY KEY,
  date            DATE         NOT NULL,
  venue           TEXT         NOT NULL,
  race_no         INT          NOT NULL,
  mode            TEXT         NOT NULL,
  race_meta       JSONB,
  field_size      INT,
  pro_top3        JSONB,
  internal_score  NUMERIC,
  internal_tier   TEXT,
  internal_reasons JSONB,
  internal_flags  JSONB,
  internal_extra  JSONB,
  v19_action      TEXT         NOT NULL,
  v19_tier        TEXT,
  v19_reason      TEXT,
  v19_boost       TEXT,
  recommend       JSONB,
  actual_top3     JSONB,
  computed_at     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (date, venue, race_no)
);

CREATE INDEX idx_v19_predictions_date ON public.v19_predictions (date);
CREATE INDEX idx_v19_predictions_mode ON public.v19_predictions (mode);
CREATE INDEX idx_v19_predictions_play ON public.v19_predictions (date) WHERE v19_action = 'play';

ALTER TABLE public.v19_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read v19_predictions"
  ON public.v19_predictions FOR SELECT USING (true);
