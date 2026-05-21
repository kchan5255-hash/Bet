// export-v19-to-web.js
// 將 V19 結果輸出到 web/src/data/v19.json，前端用 V19 model toggle
//
// 預設來源：Supabase v19_predictions table（USE_SUPABASE=1）
// 後備：data/backtest/v19/{year}/backtest-v19-<date>.json
//
// 用法：
//   USE_SUPABASE=1 node export-v19-to-web.js                  # export 全部
//   USE_SUPABASE=1 node export-v19-to-web.js 2026-05-20       # 只更新該日 (merge)
//   USE_SUPABASE=1 RECENT_N=10 node export-v19-to-web.js      # 最近 N 日
//   node export-v19-to-web.js                                 # fallback：讀 daily JSON

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const ARG_DATES = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const RECENT_N = parseInt(process.env.RECENT_N || '0', 10);
const USE_SUPABASE = process.env.USE_SUPABASE === '1';

const RACE_RESULTS_PATH = path.join(__dirname, 'web', 'src', 'data', 'race-results-by-date.json');
const OUT_FILE = path.join(__dirname, 'web', 'src', 'data', 'v19.json');

let _raceResultsByDate = null;
function getRaceResultsByDate() {
  if (!_raceResultsByDate) {
    try {
      _raceResultsByDate = JSON.parse(fs.readFileSync(RACE_RESULTS_PATH, 'utf8')).byDate || {};
    } catch { _raceResultsByDate = {}; }
  }
  return _raceResultsByDate;
}

function getActualTop3FromResults(date, raceNo) {
  const day = getRaceResultsByDate()[date];
  if (!day) return null;
  const race = (day.races || []).find((r) => r.raceNo === raceNo);
  if (!race) return null;
  const top3 = (race.top4 || [])
    .filter((r) => /^[123]$/.test(String(r.plc)))
    .sort((a, b) => Number(a.plc) - Number(b.plc))
    .slice(0, 3)
    .map((r) => String(r.no));
  return top3.length > 0 ? top3 : null;
}

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

// ── 從 daily JSON 嘅 race object 轉前端格式 ──────────────────────────────
function convertRaceFromJson(race, date) {
  const t12 = race.recommend?.qinT12;
  const bets = race.recommend?.bets || [];
  const v18 = race.v18 || null;
  const v19 = race.v19 || null;

  const qinBanker = bets.flatMap((b) => {
    const out = [];
    if (b.t1 && b.t2) out.push({ combo: `${b.t1},${b.t2}`, label: `${b.t1}-${b.t2}` });
    if (b.t1 && b.t3) out.push({ combo: `${b.t1},${b.t3}`, label: `${b.t1}-${b.t3}` });
    return out;
  });

  const isPlay = v19?.action === 'play';
  const tier = isPlay ? v19.tier : null;

  const recommend = (tier && t12) ? {
    tier,
    qinT12: t12,
    qinBanker,
    score: v18?.score,
    stakeMul: v19.stakeMul,
    boost: v19.boost || null,
  } : null;

  return {
    raceNo: race.raceNo,
    meta: race.meta || {},
    proTop3: race.proTop3 || [],
    fieldSize: race.fieldSize ?? null,
    gate: {
      action: isPlay ? 'play' : 'skip',
      tier,
      reason: v19?.reason || null,
      reasons: v18?.reasons || [],
      riskFlags: v18?.flags || [],
      jtCombo: v18?.jtCombo || null,
      jWinRate: v18?.jWinRate || null,
      tWinRate: v18?.tWinRate || null,
      draw: v18?.draw ?? null,
      class: v18?.class ?? null,
      lastBodyWeight: v18?.lastBodyWeight ?? null,
      bodyDelta: v18?.bodyDelta ?? null,
      v18Tier: v19?.v18Tier ?? null,
      boost: v19?.boost || null,
    },
    recommend,
    actualTop3: race.actualTop3 && race.actualTop3.length > 0
      ? race.actualTop3
      : (getActualTop3FromResults(date, race.raceNo) || []),
  };
}

// ── 從 Supabase row 轉前端格式 ──────────────────────────────────────────
function convertRaceFromDb(row) {
  const extra = row.internal_extra || {};
  const race = {
    raceNo: row.race_no,
    meta: row.race_meta || {},
    fieldSize: row.field_size,
    proTop3: row.pro_top3 || [],
    v18: row.internal_score == null ? null : {
      score: Number(row.internal_score),
      tier: row.internal_tier,
      reasons: row.internal_reasons || [],
      flags: row.internal_flags || [],
      jtCombo: extra.jtCombo ?? null,
      jWinRate: extra.jWinRate ?? null,
      tWinRate: extra.tWinRate ?? null,
      draw: extra.draw ?? null,
      class: extra.class ?? null,
      lastBodyWeight: extra.lastBodyWeight ?? null,
      bodyDelta: extra.bodyDelta ?? null,
      stakeMul: extra.stakeMul ?? null,
    },
    v19: {
      action: row.v19_action,
      tier: row.v19_tier,
      reason: row.v19_reason,
      boost: row.v19_boost,
      stakeMul: row.v19_extra?.stakeMul ?? row.recommend?.stakeMul ?? null,
      v18Tier: row.v19_extra?.v18Tier ?? row.recommend?.v18Tier ?? null,
      v18Score: row.v19_extra?.v18Score ?? row.recommend?.v18Score ?? null,
    },
    recommend: row.recommend || null,
    actualTop3: row.actual_top3 || [],
  };
  return convertRaceFromJson(race, row.date);
}

// ── 從 Supabase 讀 ──────────────────────────────────────────────────────
async function loadFromSupabase(dates) {
  const { loadAllV19Predictions } = require('./supabase-data');
  const opts = {};
  if (RECENT_N > 0) opts.recentN = RECENT_N;
  if (dates.length === 1) {
    opts.from = dates[0];
    opts.to = dates[0];
  }
  const rows = await loadAllV19Predictions(opts);
  const byDate = new Map();
  for (const row of rows) {
    if (!byDate.has(row.date)) byDate.set(row.date, []);
    byDate.get(row.date).push(row);
  }
  const out = {};
  for (const [date, dayRows] of byDate) {
    dayRows.sort((a, b) => a.race_no - b.race_no);
    const venue = dayRows[0]?.venue || '';
    const mode = dayRows.some((r) => r.mode === 'post') ? 'post' : 'pre';
    out[date] = {
      date,
      venue,
      mode,
      generatedAt: new Date().toISOString(),
      races: dayRows.map(convertRaceFromDb),
    };
  }
  return out;
}

// ── 從 daily JSON 讀 (fallback) ─────────────────────────────────────────
function listDatesFromJson() {
  const dates = [];
  for (const yr of ['2024', '2025', '2026']) {
    const dir = path.join(paths.DIRS.backtest, 'v19', yr);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/(\d{4}-\d{2}-\d{2})/);
      if (m) dates.push(m[1]);
    }
  }
  dates.sort();
  return dates;
}

function loadFromJson(dates) {
  const out = {};
  for (const date of dates) {
    const v19Path = path.join(paths.DIRS.backtest, 'v19', date.slice(0, 4), `backtest-v19-${date}.json`);
    if (!fs.existsSync(v19Path)) {
      console.warn(`SKIP ${date}: no v19 backtest`);
      continue;
    }
    const data = readJSON(v19Path);
    out[date] = {
      date,
      venue: data.venue || '',
      mode: data.mode || 'post',
      generatedAt: new Date().toISOString(),
      races: (data.races || []).map((race) => convertRaceFromJson(race, date)),
    };
  }
  return out;
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  const isPartialUpdate = ARG_DATES.length > 0 || RECENT_N > 0;

  let newByDate = {};
  let source = 'json';

  if (USE_SUPABASE) {
    try {
      newByDate = await loadFromSupabase(ARG_DATES);
      source = 'supabase';
    } catch (err) {
      console.warn(`Supabase 讀取失敗，退回 daily JSON：${err.message}`);
    }
  }

  if (source === 'json') {
    let dates = ARG_DATES.length ? ARG_DATES.slice() : listDatesFromJson();
    if (RECENT_N > 0) dates = dates.slice(-RECENT_N);
    dates.sort();
    if (!dates.length) {
      console.log('No dates to export.');
      return;
    }
    newByDate = loadFromJson(dates);
  }

  // 部分更新時 merge 既有 v19.json，只覆寫今次拉到嘅日期
  let mergedByDate = {};
  if (isPartialUpdate && fs.existsSync(OUT_FILE)) {
    try {
      mergedByDate = readJSON(OUT_FILE).byDate || {};
    } catch { mergedByDate = {}; }
  }
  Object.assign(mergedByDate, newByDate);

  let totalRaces = 0, totalPlay = 0, totalS = 0, totalA = 0, totalB = 0;
  for (const date of Object.keys(newByDate).sort()) {
    const races = newByDate[date].races;
    const play = races.filter((r) => r.gate.action === 'play').length;
    const s = races.filter((r) => r.gate.tier === 'S').length;
    const a = races.filter((r) => r.gate.tier === 'A').length;
    const b = races.filter((r) => r.gate.tier === 'B').length;
    totalRaces += races.length; totalPlay += play; totalS += s; totalA += a; totalB += b;
    console.log(`  ${date}: ${races.length} races / ${play} play (S=${s} A=${a} B=${b}) [mode=${newByDate[date].mode}]`);
  }

  const out = {
    dates: Object.keys(mergedByDate).sort(),
    byDate: mergedByDate,
    generatedAt: new Date().toISOString(),
    notes: `V19 = V18 + distance filter (skip 1000/1650/2000+/unknown, +1.5 boost for 1400/1600). ` +
           `${totalRaces} races / ${totalPlay} play (S=${totalS} A=${totalA} B=${totalB}). ` +
           `三年連贏膽拖 ROI +52.6% / 盈虧 +$64,076 / 三年皆正 (2024 +38% / 2025 +64% / 2026 +57%).`,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), 'utf8');
  console.log(`\nWrote ${out.dates.length} dates → ${OUT_FILE} [source=${source}]`);
}

main().catch((err) => { console.error(err); process.exit(1); });
