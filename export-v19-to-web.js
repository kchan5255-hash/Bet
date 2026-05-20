// export-v19-to-web.js
// 將 V19 backtest 輸出到 web/src/data/v19.json，前端用 V19 model toggle
//
// 用法：
//   node export-v19-to-web.js                    # 預設 export 全期
//   node export-v19-to-web.js 2026-05-20         # 指定一日
//   RECENT_N=10 node export-v19-to-web.js        # 最近 N 日

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const ARG_DATES = process.argv.slice(2);
const RECENT_N = parseInt(process.env.RECENT_N || '0', 10);

const RACE_RESULTS_PATH = path.join(__dirname, 'web', 'src', 'data', 'race-results-by-date.json');
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
  const race = (day.races || []).find(r => r.raceNo === raceNo);
  if (!race) return null;
  const top3 = (race.top4 || [])
    .filter(r => /^[123]$/.test(String(r.plc)))
    .sort((a, b) => Number(a.plc) - Number(b.plc))
    .slice(0, 3)
    .map(r => String(r.no));
  return top3.length > 0 ? top3 : null;
}

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function listDates() {
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

function convertRace(race, date) {
  const t12 = race.recommend?.qinT12;
  const bets = race.recommend?.bets || [];
  const v18 = race.v18 || null;
  const v19 = race.v19 || null;

  const qinBanker = bets.flatMap(b => {
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

function main() {
  let dates = ARG_DATES.length ? ARG_DATES.slice() : listDates();
  if (RECENT_N > 0) dates = dates.slice(-RECENT_N);
  dates.sort();

  if (!dates.length) {
    console.log('No dates to export.');
    return;
  }

  const outFile = path.join(__dirname, 'web', 'src', 'data', 'v19.json');
  const isSingleUpdate = ARG_DATES.length > 0;

  // 指定日期時 merge 現有資料，只更新指定日期
  let existingByDate = {};
  if (isSingleUpdate && fs.existsSync(outFile)) {
    try {
      existingByDate = readJSON(outFile).byDate || {};
    } catch { existingByDate = {}; }
  }

  const byDate = isSingleUpdate ? { ...existingByDate } : {};
  let totalRaces = 0, totalPlay = 0, totalS = 0, totalA = 0, totalB = 0;
  for (const date of dates) {
    const v19Path = path.join(paths.DIRS.backtest, 'v19', date.slice(0, 4), `backtest-v19-${date}.json`);
    if (!fs.existsSync(v19Path)) {
      console.warn(`SKIP ${date}: no v19 backtest`);
      continue;
    }
    const data = readJSON(v19Path);
    const races = (data.races || []).map(race => convertRace(race, date));
    const play = races.filter(r => r.gate.action === 'play').length;
    const s = races.filter(r => r.gate.tier === 'S').length;
    const a = races.filter(r => r.gate.tier === 'A').length;
    const b = races.filter(r => r.gate.tier === 'B').length;
    byDate[date] = { date, venue: data.venue || '', races };
    totalRaces += races.length; totalPlay += play; totalS += s; totalA += a; totalB += b;
    console.log(`  ${date}: ${races.length} races / ${play} play (S=${s} A=${a} B=${b})`);
  }

  const out = {
    dates: Object.keys(byDate).sort(),
    byDate,
    generatedAt: new Date().toISOString(),
    notes: `V19 = V18 + distance filter (skip 1000/1650/2000+/unknown, +1.5 boost for 1400/1600). ` +
           `${totalRaces} races / ${totalPlay} play (S=${totalS} A=${totalA} B=${totalB}). ` +
           `三年連贏膽拖 ROI +52.6% / 盈虧 +$64,076 / 三年皆正 (2024 +38% / 2025 +64% / 2026 +57%).`,
  };

  fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');
  console.log(`\nWrote ${out.dates.length} dates → ${outFile}`);
}

main();
