// supabase-data.js
// 從 Supabase 讀取 horse_profiles + horse_records，組成 build-analysis-from-graphql 需要的格式：
//   Map<code, { profile: {...}, records: [...] }>
//
// 對應原本 horses-all.json 的結構，讓 features-pro.js 可以直接消費（包含 DD/MM/YY 日期格式）。

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

let _client = null;
function client() {
  if (!_client) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    _client = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _client;
}

// PostgreSQL DATE (YYYY-MM-DD) → DD/MM/YY (HKJC 格式，與 features-pro parseDateDMY 相容)
function toDMY(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = String(isoDate).split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y.slice(2)}`;
}

// 把 horse_profiles row 還原為原始 raw_profile（HKJC 表格鍵值對）
function profileFromRow(row) {
  if (!row) return {};
  if (row.raw_profile && typeof row.raw_profile === 'object') return row.raw_profile;
  // raw_profile 應該都有；若無則最低限度組裝
  const p = {};
  if (row.country_origin && row.age) p['Country of Origin / Age'] = `${row.country_origin} / ${row.age}`;
  if (row.colour && row.sex) p['Colour / Sex'] = `${row.colour} / ${row.sex}`;
  if (row.wins != null && row.total_starts != null) {
    p['No. of 1-2-3-Starts*'] = `${row.wins}-${row.seconds}-${row.thirds}-${row.total_starts}`;
  }
  if (row.current_trainer) p['Trainer'] = row.current_trainer;
  if (row.current_owner) p['Owner'] = row.current_owner;
  return p;
}

function recordFromRow(row) {
  return {
    place: row.place || '',
    date: toDMY(row.race_date),
    track: row.track || '',
    distance: row.distance != null ? String(row.distance) : '',
    going: row.going || '',
    classNo: row.class_no || '',
    draw: row.draw || '',
    rating: row.rating || '',
    trainer: row.trainer || '',
    jockey: row.jockey || '',
    lbw: row.lbw || '',
    odds: row.odds || '',
    actWt: row.act_wt || '',
    bodyWeight: row.body_weight || '',
  };
}

// 分批拉資料（Supabase 預設 1000 筆上限）
async function fetchInChunks(query, chunkSize = 1000) {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + chunkSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < chunkSize) break;
    from += chunkSize;
  }
  return all;
}

// 主入口：傳入 codes 陣列，回傳 Map<code, { profile, records }>
// records 依日期由新到舊排序（與 horse-scraper.js 一致）
async function loadHorsesByCodes(codes) {
  const sb = client();
  const uniqCodes = [...new Set(codes.filter(Boolean))];
  if (!uniqCodes.length) return new Map();

  // profile 一次拉
  const { data: profiles, error: pErr } = await sb
    .from('horse_profiles')
    .select('*')
    .in('horse_code', uniqCodes);
  if (pErr) throw new Error(`horse_profiles: ${pErr.message}`);

  const profileMap = new Map(profiles.map((r) => [r.horse_code, r]));

  // records 分批 IN 查詢（避免 URL 過長），每批 200 個 code
  const BATCH = 200;
  const recordsMap = new Map();
  for (let i = 0; i < uniqCodes.length; i += BATCH) {
    const slice = uniqCodes.slice(i, i + BATCH);
    const rows = await fetchInChunks(
      sb.from('horse_records')
        .select('*')
        .in('horse_code', slice)
        .order('race_date', { ascending: false }),
    );
    for (const row of rows) {
      const arr = recordsMap.get(row.horse_code) || [];
      arr.push(recordFromRow(row));
      recordsMap.set(row.horse_code, arr);
    }
  }

  const out = new Map();
  for (const code of uniqCodes) {
    out.set(code, {
      code,
      profile: profileFromRow(profileMap.get(code)),
      records: recordsMap.get(code) || [],
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// V19 predictions：模型計算結果
// ─────────────────────────────────────────────────────────────────────

function v19RowFromRace(date, venue, race, mode) {
  const internal = race.v18 || null;
  const v19 = race.v19 || null;
  const baseRecommend = race.recommend || null;
  // 將 v19 嘅執行細節 (stakeMul / boost / v18Tier / v18Score) 合併入 recommend，
  // 令 convertRaceFromDb 讀返出嚟同 daily JSON convertRaceFromJson 結果一致
  const recommend = baseRecommend
    ? {
        ...baseRecommend,
        stakeMul: v19?.stakeMul ?? baseRecommend.stakeMul ?? null,
        boost: v19?.boost ?? baseRecommend.boost ?? null,
        v18Tier: v19?.v18Tier ?? baseRecommend.v18Tier ?? null,
        v18Score: v19?.v18Score ?? baseRecommend.v18Score ?? null,
      }
    : null;
  // internal_extra：保留前端 gate 顯示需要嘅內部細節
  const internalExtra = internal
    ? {
        jtCombo: internal.jtCombo ?? null,
        jWinRate: internal.jWinRate ?? null,
        tWinRate: internal.tWinRate ?? null,
        draw: internal.draw ?? null,
        class: internal.class ?? null,
        lastBodyWeight: internal.lastBodyWeight ?? null,
        bodyDelta: internal.bodyDelta ?? null,
        stakeMul: internal.stakeMul ?? null,
      }
    : null;
  // v19_extra：保留 distance-skip 等情境下嘅 v18Tier / v18Score（前端 gate 顯示用）
  const v19Extra = v19
    ? {
        v18Tier: v19.v18Tier ?? null,
        v18Score: v19.v18Score ?? null,
        stakeMul: v19.stakeMul ?? null,
      }
    : null;
  return {
    date,
    venue: venue || '',
    race_no: race.raceNo,
    mode: mode || 'post',
    race_meta: race.meta || {},
    field_size: race.fieldSize ?? null,
    pro_top3: race.proTop3 || [],
    internal_score: internal?.score ?? null,
    internal_tier: internal?.tier ?? null,
    internal_reasons: internal?.reasons || [],
    internal_flags: internal?.flags || [],
    internal_extra: internalExtra,
    v19_action: v19?.action || (recommend ? 'play' : 'skip'),
    v19_tier: v19?.tier ?? null,
    v19_reason: v19?.reason ?? null,
    v19_boost: v19?.boost ?? null,
    v19_extra: v19Extra,
    recommend,
    actual_top3: race.actualTop3 || null,
  };
}

async function upsertV19Predictions(rows) {
  if (!rows?.length) return { count: 0 };
  const sb = client();
  const CHUNK = 500;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await sb
      .from('v19_predictions')
      .upsert(slice, { onConflict: 'date,venue,race_no' });
    if (error) throw new Error(`v19_predictions upsert: ${error.message}`);
    total += slice.length;
  }
  return { count: total };
}

async function loadV19PredictionsByDate(date) {
  const sb = client();
  const { data, error } = await sb
    .from('v19_predictions')
    .select('*')
    .eq('date', date)
    .order('race_no', { ascending: true });
  if (error) throw new Error(`v19_predictions select: ${error.message}`);
  return data || [];
}

async function loadAllV19Predictions(opts = {}) {
  const sb = client();
  let q = sb.from('v19_predictions').select('*');
  if (opts.from) q = q.gte('date', opts.from);
  if (opts.to) q = q.lte('date', opts.to);
  q = q.order('date', { ascending: true }).order('race_no', { ascending: true });
  const rows = await fetchInChunks(q, 1000);
  if (opts.recentN && opts.recentN > 0) {
    const dates = [...new Set(rows.map((r) => r.date))].sort();
    const keep = new Set(dates.slice(-opts.recentN));
    return rows.filter((r) => keep.has(r.date));
  }
  return rows;
}

// 賽果是否齊全：race_results 有該日 row → 視為已入
async function isResultsLoaded(date) {
  const sb = client();
  const { count, error } = await sb
    .from('race_results')
    .select('*', { count: 'exact', head: true })
    .eq('date', date);
  if (error) throw new Error(`race_results count: ${error.message}`);
  return (count || 0) > 0;
}

// 拎該日已有賽果嘅 race_no 集合（給 detect-race-day 用）
async function loadResultRaceNos(date) {
  const sb = client();
  const { data, error } = await sb
    .from('race_results')
    .select('race_no')
    .eq('date', date);
  if (error) throw new Error(`race_results race_no: ${error.message}`);
  return new Set((data || []).map((r) => Number(r.race_no)));
}

module.exports = {
  loadHorsesByCodes,
  v19RowFromRace,
  upsertV19Predictions,
  loadV19PredictionsByDate,
  loadAllV19Predictions,
  isResultsLoaded,
  loadResultRaceNos,
};
