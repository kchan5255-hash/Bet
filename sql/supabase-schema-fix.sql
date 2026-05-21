-- supabase-schema-fix.sql
-- 修正 horse_records 表的 unique 約束
-- 在 Supabase SQL Editor 執行

-- 1. 移除舊約束（如果存在）
ALTER TABLE public.horse_records
  DROP CONSTRAINT IF EXISTS horse_records_horse_code_race_date_track_draw_key;

-- 2. 加上新約束（horse_code + race_date + distance 唯一）
ALTER TABLE public.horse_records
  ADD CONSTRAINT horse_records_unique
  UNIQUE (horse_code, race_date, distance);
