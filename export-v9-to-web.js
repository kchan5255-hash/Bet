// export-v9-to-web.js
// 將 data/backtest/v9/{year}/backtest-v9-{date}.json 轉成 web/src/data/v9-results.json
// 前端 /results 頁 V9 toggle 用
//
// 用法：
//   node export-v9-to-web.js                       # export 全部已存在嘅 V9 backtest
//   node export-v9-to-web.js 2026-05-24            # 只更新該日 (merge)
//   RECENT_N=10 node export-v9-to-web.js           # 最近 N 日
//
// merge 模式（指定 date 或 RECENT_N）：唔會抹掉其他日期，只覆寫今次拉到嘅日

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const ARG_DATES = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const RECENT_N = parseInt(process.env.RECENT_N || '0', 10);
const OUT_FILE = path.join(__dirname, 'web', 'src', 'data', 'v9-results.json');

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function listDates() {
  const dates = [];
  for (const yr of ['2024', '2025', '2026']) {
    const dir = path.join(paths.DIRS.backtest, 'v9', yr);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/(\d{4}-\d{2}-\d{2})/);
      if (m) dates.push(m[1]);
    }
  }
  dates.sort();
  return dates;
}

function convertRace(race) {
  return {
    raceNo: race.raceNo,
    v9Temp: race.v9Temp,
    v9Top4: race.v9Top4,
    signals: race.signals,
    runners: (race.v9Ranking || []).map((r) => ({
      no: String(r.no),
      rank: r.rank,
      rawScore: r.score,
      modelProbability: r.prob,
      reliability: r.reliability,
      groups: r.groups,
      topFactors: r.topFactors,
    })),
  };
}

function loadDay(date) {
  const file = paths.backtestPath('v9', date);
  if (!fs.existsSync(file)) {
    console.warn(`SKIP ${date}: no v9 backtest`);
    return null;
  }
  const v9 = readJSON(file);
  return {
    date,
    venue: v9.venue || '',
    model: v9.model || 'v9',
    races: (v9.races || []).map(convertRace),
  };
}

function main() {
  const isPartialUpdate = ARG_DATES.length > 0 || RECENT_N > 0;

  let dates = ARG_DATES.length ? ARG_DATES.slice() : listDates();
  if (RECENT_N > 0) dates = dates.slice(-RECENT_N);
  dates.sort();

  if (!dates.length) {
    console.log('No dates to export.');
    return;
  }

  // 部分更新時 merge 既有
  let mergedByDate = {};
  if (isPartialUpdate && fs.existsSync(OUT_FILE)) {
    try {
      mergedByDate = readJSON(OUT_FILE).byDate || {};
    } catch { mergedByDate = {}; }
  }

  for (const date of dates) {
    const day = loadDay(date);
    if (!day) continue;
    mergedByDate[date] = day;
    console.log(`  ${date} (${day.races.length} races)`);
  }

  const output = {
    dates: Object.keys(mergedByDate).sort(),
    byDate: mergedByDate,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nWrote ${output.dates.length} dates → ${OUT_FILE}`);
}

main();
