-- supabase-rls-lockdown.sql
-- 安全加固：將敏感 table 嘅 SELECT 由 public 收緊，封鎖 anon role
-- 在 Supabase SQL Editor 一次過執行
--
-- 背景：
--   原本所有 table 都係 `for select using (true)`，配合前端 ship 出去嘅
--   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY，任何人 createClient + .from('xxx').select('*')
--   就 dump 晒模型輸出、賽果、馬匹資料。
--
-- 策略：
--   - 模型輸出 / 賽果 / 馬匹資料：service_role 寫，無人讀（前端讀本地 JSON）
--   - odds / race_meta：保留 anon SELECT（前端 useLiveOdds 需要 realtime 賠率）
--   - service_role 預設 bypass RLS，唔需要額外 policy
--
-- 部署：
--   1. 喺 Supabase SQL Editor 跑呢個檔
--   2. 跑驗證 query 確認 anon 攞唔到 v19_predictions
--   3. SSR build 因為讀本地 JSON 唔受影響，正常運作

-- ============================================================
-- v19_predictions：完全鎖死，唔對外讀
-- ============================================================
DROP POLICY IF EXISTS "public read v19_predictions" ON public.v19_predictions;
REVOKE SELECT ON public.v19_predictions FROM anon;

-- ============================================================
-- race_results：完全鎖死
-- ============================================================
DROP POLICY IF EXISTS "public read race_results" ON public.race_results;
REVOKE SELECT ON public.race_results FROM anon;

-- ============================================================
-- race_dividends：完全鎖死
-- ============================================================
DROP POLICY IF EXISTS "public read race_dividends" ON public.race_dividends;
REVOKE SELECT ON public.race_dividends FROM anon;

-- ============================================================
-- horse_records：完全鎖死
-- ============================================================
DROP POLICY IF EXISTS "public read horse_records" ON public.horse_records;
REVOKE SELECT ON public.horse_records FROM anon;

-- ============================================================
-- horse_profiles：完全鎖死
-- ============================================================
DROP POLICY IF EXISTS "public read horse_profiles" ON public.horse_profiles;
REVOKE SELECT ON public.horse_profiles FROM anon;

-- ============================================================
-- vet_records：完全鎖死
-- ============================================================
DROP POLICY IF EXISTS "public read vet_records" ON public.vet_records;
REVOKE SELECT ON public.vet_records FROM anon;

-- ============================================================
-- race_cards：完全鎖死
-- ============================================================
DROP POLICY IF EXISTS "public read race_cards" ON public.race_cards;
REVOKE SELECT ON public.race_cards FROM anon;

-- ============================================================
-- odds / race_meta：保留 anon SELECT（useLiveOdds realtime 需要）
-- 賠率屬公開資訊，HKJC 官網都見到，唔屬於我哋嘅 alpha
-- ============================================================
-- 政策保持原狀，不作改動

-- ============================================================
-- 驗證 query（用 anon role 跑）
-- ============================================================
-- SET ROLE anon;
-- SELECT count(*) FROM public.v19_predictions;  -- 預期 0 或 permission denied
-- SELECT count(*) FROM public.race_results;     -- 預期 0 或 permission denied
-- SELECT count(*) FROM public.odds;             -- 預期返正常
-- RESET ROLE;
