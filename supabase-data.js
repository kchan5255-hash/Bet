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

module.exports = { loadHorsesByCodes };
