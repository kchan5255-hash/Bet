// export-pro-gate-to-web.js
// 將 V11 模型結果（V11 tiered strong/banker）輸出到 web/src/data/pro-gate.json，
// 供前端「Pro+Gate」 model toggle 使用。
//
// 規則：用 data/backtest/v11/{year}/backtest-v11-{date}.json 嘅 races[].recommendations
// 同 recommend 直接 ship。如果某日 V11 backtest 唔存在，自動 fallback V10 → Pro+V9。
//
// 用法：
//   node export-pro-gate-to-web.js                      # 預設輸出最近 5 日推介
//   node export-pro-gate-to-web.js 2026-05-21 2026-05-25 # 指定日期
//   FORCE_ALL=1 node export-pro-gate-to-web.js          # 全部歷史日子

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const ARG_DATES = process.argv.slice(2);
const FORCE_ALL = process.env.FORCE_ALL === '1';
const RECENT_N = parseInt(process.env.RECENT_N || '5', 10);

const YEAR = process.env.YEAR || '2026';
const proDir = path.join(paths.DIRS.backtest, 'pro', YEAR);
const v9Dir  = path.join(paths.DIRS.backtest, 'v9', YEAR);
const v10Dir = path.join(paths.DIRS.backtest, 'v10', YEAR);
const v11Dir = path.join(paths.DIRS.backtest, 'v11', YEAR);

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function listDatesIn(dir, prefix) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
    .map(f => f.replace(prefix, '').replace('.json', ''))
    .sort();
}

function pickFutureDate(date) {
  const proPath = paths.backtestPath('pro', date);
  if (!fs.existsSync(proPath)) return false;
  const data = readJSON(proPath);
  const races = data.races || [];
  if (races.length === 0) return false;
  const realRaces = races.filter(r => r.proRanking && r.proRanking.length > 0);
  if (realRaces.length === 0) return false;
  return realRaces.every(r => !r.actualTop3 || r.actualTop3.length < 3);
}

function loadV9GateMap(date) {
  const p = paths.backtestPath('v9', date);
  if (!fs.existsSync(p)) return new Map();
  const data = readJSON(p);
  const map = new Map();
  for (const r of (data.races || [])) {
    map.set(r.raceNo, {
      action: r.recommendations?.action || 'skip',
      reasons: r.recommendations?.reasons || [],
      riskFlags: r.recommendations?.riskFlags || [],
      fieldSize: r.fieldSize,
    });
  }
  return map;
}

function convertRace(race, gate) {
  const ranking = race.proRanking || [];
  const top3 = ranking.slice(0, 3).map(r => ({
    no: String(r.no),
    name: r.name || '',
    prob: Number(r.prob) || 0,
    draw: Number(r.draw) || 0,
  }));
  const isPlay = gate?.action === 'play' && top3.length === 3;

  let recommend = null;
  if (isPlay) {
    const t1 = top3[0].no, t2 = top3[1].no, t3 = top3[2].no;
    recommend = {
      qinT12: { combo: `${t1},${t2}`, label: `${t1}-${t2}` },
      qinBanker: [
        { combo: `${t1},${t2}`, label: `${t1}-${t2}` },
        { combo: `${t1},${t3}`, label: `${t1}-${t3}` },
      ],
    };
  }

  return {
    raceNo: race.raceNo,
    meta: race.meta || {},
    proTop3: top3,
    fieldSize: gate?.fieldSize ?? null,
    gate: {
      action: gate?.action ?? 'skip',
      reasons: gate?.reasons ?? [],
      riskFlags: gate?.riskFlags ?? [],
    },
    recommend,
    actualTop3: race.actualTop3 || [],
  };
}

function convertV11Race(v11Race) {
  // V11 backtest 含 tier (strong/banker)、metrics
  return {
    raceNo: v11Race.raceNo,
    meta: v11Race.meta || {},
    proTop3: v11Race.proTop3 || [],
    fieldSize: v11Race.fieldSize ?? null,
    gate: {
      action: v11Race.recommend ? 'play' : 'skip',
      tier: v11Race.recommendations?.tier ?? null,
      reasons: v11Race.recommendations?.reasons ?? [],
      riskFlags: v11Race.recommendations?.riskFlags ?? [],
    },
    recommend: v11Race.recommend ?? null,
    actualTop3: v11Race.actualTop3 || [],
  };
}

function convertV10Race(v10Race) {
  // V10 backtest 已經有 proTop3、recommendations、recommend 全部齊全
  return {
    raceNo: v10Race.raceNo,
    meta: v10Race.meta || {},
    proTop3: v10Race.proTop3 || [],
    fieldSize: v10Race.fieldSize ?? null,
    gate: {
      action: v10Race.recommendations?.action ?? 'skip',
      reasons: v10Race.recommendations?.reasons ?? [],
      riskFlags: v10Race.recommendations?.riskFlags ?? [],
    },
    recommend: v10Race.recommend ?? null,
    actualTop3: v10Race.actualTop3 || [],
  };
}

function main() {
  let dates;
  if (ARG_DATES.length) {
    dates = ARG_DATES.slice();
  } else {
    const proDates = listDatesIn(proDir, 'backtest-');
    if (FORCE_ALL) {
      dates = proDates;
    } else {
      // 預設：搵「全日未跑完」嘅日子；如果冇，fallback 用最近 N 日
      const future = proDates.filter(pickFutureDate);
      if (future.length) {
        dates = future;
      } else {
        dates = proDates.slice(-RECENT_N);
      }
    }
  }
  dates.sort();

  if (!dates.length) {
    console.log('No dates to export. Use FORCE_ALL=1 or pass dates as args.');
    return;
  }

  const byDate = {};
  for (const date of dates) {
    const v11Path = path.join(v11Dir, `backtest-v11-${date}.json`);
    const v10Path = path.join(v10Dir, `backtest-v10-${date}.json`);
    let races;
    let venue;
    let source;
    if (fs.existsSync(v11Path)) {
      const v11Data = readJSON(v11Path);
      races = (v11Data.races || []).map(convertV11Race);
      venue = v11Data.venue || '';
      source = 'v11';
    } else if (fs.existsSync(v10Path)) {
      const v10Data = readJSON(v10Path);
      races = (v10Data.races || []).map(convertV10Race);
      venue = v10Data.venue || '';
      source = 'v10';
    } else {
      const proPath = paths.backtestPath('pro', date);
      if (!fs.existsSync(proPath)) {
        console.warn(`SKIP ${date}: missing v11/v10/pro backtest`);
        continue;
      }
      const proData = readJSON(proPath);
      const gateMap = loadV9GateMap(date);
      races = (proData.races || [])
        .filter(r => r.proRanking && r.proRanking.length > 0)
        .map(r => convertRace(r, gateMap.get(r.raceNo)));
      venue = proData.venue || '';
      source = 'pro+v9-fallback';
    }
    byDate[date] = { date, venue, races, source };
    const playCount = races.filter(r => r.gate.action === 'play').length;
    const strongCount = races.filter(r => r.gate.tier === 'strong').length;
    console.log(`  ${date} [${source}]: ${races.length} races, ${playCount} play (strong=${strongCount})`);
  }

  const output = {
    dates: Object.keys(byDate).sort(),
    byDate,
    generatedAt: new Date().toISOString(),
    notes: 'V11 = Pro+V9 + 5-filter. Tier S (連贏單注): rel≥0.50, prob≥10%, suit≥0.60, records≥10, V9 T1 prob≥14%. Tier B (連贏膽拖): rel≥0.50, prob≥10%, suit≥0.60, T2 rel≥0.50, V9 T1 prob≥14%. Backtest 32 days/322 races: Tier S 連贏單注 +$7,280 (ROI +119.34%); Tier B 連贏膽拖 +$13,065 (ROI +77.77%). 組合策略 +$20,345 (ROI +88.84%).',
  };

  const outFile = path.join(__dirname, 'web', 'src', 'data', 'pro-gate.json');
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nWrote ${output.dates.length} dates → ${outFile}`);
}

main();
