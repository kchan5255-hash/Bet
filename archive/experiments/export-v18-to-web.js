// export-v18-to-web.js
// 將 V18 backtest 輸出到 web/src/data/v18.json，前端用 V18 model toggle
//
// 用法：
//   node export-v18-to-web.js                    # 預設 export 全期
//   node export-v18-to-web.js 2026-05-20         # 指定一日
//   RECENT_N=10 node export-v18-to-web.js        # 最近 N 日

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const ARG_DATES = process.argv.slice(2);
const RECENT_N = parseInt(process.env.RECENT_N || '0', 10);

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function listDates() {
  const dates = [];
  for (const yr of ['2024', '2025', '2026']) {
    const dir = path.join(paths.DIRS.backtest, 'v18', yr);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/(\d{4}-\d{2}-\d{2})/);
      if (m) dates.push(m[1]);
    }
  }
  dates.sort();
  return dates;
}

// 將 V14 嘅 bets[] 同 V18 score 拼成 web schema
function convertRace(race) {
  const t12 = race.recommend?.qinT12;
  const bets = race.recommend?.bets || [];
  const v18 = race.v18 || null;
  const tier = v18?.tier || null;

  // 整 qinBanker 數組（前端 expect 格式）
  const qinBanker = bets.flatMap(b => {
    const out = [];
    if (b.t1 && b.t2) out.push({ combo: `${b.t1},${b.t2}`, label: `${b.t1}-${b.t2}` });
    if (b.t1 && b.t3) out.push({ combo: `${b.t1},${b.t3}`, label: `${b.t1}-${b.t3}` });
    return out;
  });

  // V18 唔過 gate（skip）→ recommend = null
  const recommend = (tier && t12) ? {
    tier,
    qinT12: t12,
    qinBanker,
    score: v18.score,
    stakeMul: v18.stakeMul,
  } : null;

  return {
    raceNo: race.raceNo,
    meta: race.meta || {},
    proTop3: race.proTop3 || [],
    fieldSize: race.fieldSize ?? null,
    gate: {
      action: tier ? 'play' : 'skip',
      tier,
      reasons: v18?.reasons || [],
      riskFlags: v18?.flags || [],
      jtCombo: v18?.jtCombo || null,
      jWinRate: v18?.jWinRate || null,
      tWinRate: v18?.tWinRate || null,
      draw: v18?.draw ?? null,
      class: v18?.class ?? null,
      lastBodyWeight: v18?.lastBodyWeight ?? null,
      bodyDelta: v18?.bodyDelta ?? null,
    },
    recommend,
    actualTop3: race.actualTop3 || [],
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

  const byDate = {};
  let totalRaces = 0, totalPlay = 0, totalS = 0, totalA = 0, totalB = 0;
  for (const date of dates) {
    const v18Path = path.join(paths.DIRS.backtest, 'v18', date.slice(0, 4), `backtest-v18-${date}.json`);
    if (!fs.existsSync(v18Path)) {
      console.warn(`SKIP ${date}: no v18 backtest`);
      continue;
    }
    const data = readJSON(v18Path);
    const races = (data.races || []).map(convertRace);
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
    notes: `V18 = V14 ensemble (V12+V13) + j×t combo / weight delta / draw / class gates. ` +
           `${totalRaces} races / ${totalPlay} play (S=${totalS} A=${totalA} B=${totalB}). ` +
           `連贏單注 ROI +20.1% / 連贏膽拖 ROI +30.3% / 三年皆正。`,
  };

  const outFile = path.join(__dirname, 'web', 'src', 'data', 'v18.json');
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');
  console.log(`\nWrote ${out.dates.length} dates → ${outFile}`);
}

main();
