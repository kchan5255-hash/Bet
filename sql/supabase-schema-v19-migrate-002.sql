-- supabase-schema-v19-migrate-002.sql
-- 加入 v19_extra JSONB 欄位（distance-skip 場保留內部 tier/score）
-- 此 migration 唔需要 DROP table，只係加新欄位，跑完之後重跑 migrate-backtest-to-supabase.js

ALTER TABLE public.v19_predictions
  ADD COLUMN IF NOT EXISTS v19_extra JSONB;
