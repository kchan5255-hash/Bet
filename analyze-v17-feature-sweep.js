// analyze-v17-feature-sweep.js
// Sweep V17-A 全部嘅 picks，加 5 個 features 試提升勝率：
//  1) Score gap (top1 distAvgPlace vs top2)
//  2) Field size
//  3) Class（班次）
//  4) Jockey 質素（按全期 win rate 分 tier）
//  5) Trainer 質素
//  6) Draw（top1 檔位）
//
// 唔用賠率（winOdds）

const fs = require('fs');
const path = require('path');

const ROOT = 'd:/AI/Bet';
const STAKE = 100;

function loadDividends(date) {
  const fp = path.join(ROOT, `data/dividends/${date.slice(0,4)}/dividends-${date}.json`);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}
function loadResults(date) {
  const fp = path.join(ROOT, `data/results/${date.slice(0,4)}/results-full-${date}.json`);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function findPayout(divData, raceNo, pair, type) {
  if (!divData) return 0;
  const race = divData.races?.find(r => r.raceNo === raceNo);
  if (!race) return 0;
  const list = race.dividends?.[type] || [];
  const sortedKey = pair.slice().sort((a, b) => Number(a) - Number(b)).join(',');
  for (const d of list) {
    const k = d.combo.split(',').map(s => s.trim()).sort((a, b) => Number(a) - Number(b)).join(',');
    if (k === sortedKey) return d.amount;
  }
  return 0;
}

// ===== Step 1: 計每個 jockey / trainer 嘅全期 wins ratio =====
// 先掃晒 results 計 baseline
const jockeyStats = new Map();   // name -> { runs, wins, places }
const trainerStats = new Map();
const dates = [];
for (const yr of ['2024', '2025', '2026']) {
  const dir = path.join(ROOT, `data/results/${yr}`);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) dates.push(m[1]);
  }
}
dates.sort();

for (const date of dates) {
  const res = loadResults(date);
  if (!res) continue;
  for (const race of res.races) {
    for (const r of race.runners || []) {
      const plc = parseInt(r.plc, 10);
      if (!Number.isFinite(plc)) continue;
      const j = r.jockey || '';
      const t = r.trainer || '';
      if (j) {
        if (!jockeyStats.has(j)) jockeyStats.set(j, { runs: 0, wins: 0, top3: 0 });
        const s = jockeyStats.get(j);
        s.runs++;
        if (plc === 1) s.wins++;
        if (plc <= 3) s.top3++;
      }
      if (t) {
        if (!trainerStats.has(t)) trainerStats.set(t, { runs: 0, wins: 0, top3: 0 });
        const s = trainerStats.get(t);
        s.runs++;
        if (plc === 1) s.wins++;
        if (plc <= 3) s.top3++;
      }
    }
  }
}

// 分 tier：win rate >= 12% = elite, 8-12% = good, < 8% = below
function jockeyTier(name) {
  const s = jockeyStats.get(name);
  if (!s || s.runs < 100) return 'unknown';
  const wr = s.wins / s.runs;
  if (wr >= 0.12) return 'elite';
  if (wr >= 0.08) return 'good';
  return 'below';
}
function trainerTier(name) {
  const s = trainerStats.get(name);
  if (!s || s.runs < 100) return 'unknown';
  const wr = s.wins / s.runs;
  if (wr >= 0.10) return 'elite';
  if (wr >= 0.07) return 'good';
  return 'below';
}

// Output top jockeys for sanity
const sortedJ = [...jockeyStats.entries()].filter(([n,s]) => s.runs >= 100).sort((a,b) => (b[1].wins/b[1].runs) - (a[1].wins/a[1].runs));
console.log('\n## Jockey 排名（全期 ≥ 100 runs）— 用嚟分 tier');
console.log('| 排 | 騎師 | 出賽 | 勝 | 勝率 | top3 率 |');
console.log('|---|---|---:|---:|---:|---:|');
for (let i = 0; i < Math.min(15, sortedJ.length); i++) {
  const [n, s] = sortedJ[i];
  console.log(`| ${i+1} | ${n} | ${s.runs} | ${s.wins} | ${(s.wins/s.runs*100).toFixed(1)}% | ${(s.top3/s.runs*100).toFixed(1)}% |`);
}

const sortedT = [...trainerStats.entries()].filter(([n,s]) => s.runs >= 100).sort((a,b) => (b[1].wins/b[1].runs) - (a[1].wins/a[1].runs));
console.log('\n## Trainer 排名（全期 ≥ 100 runs）');
console.log('| 排 | 練馬師 | 出賽 | 勝 | 勝率 |');
console.log('|---|---|---:|---:|---:|');
for (let i = 0; i < Math.min(15, sortedT.length); i++) {
  const [n, s] = sortedT[i];
  console.log(`| ${i+1} | ${n} | ${s.runs} | ${s.wins} | ${(s.wins/s.runs*100).toFixed(1)}% |`);
}

// ===== Step 2: Build picks dataset =====
function classNum(name) {
  if (!name) return null;
  const m = String(name).match(/第(\S+?)班/);
  if (!m) return null;
  const t = m[1];
  if (t === '一') return 1;
  if (t === '二') return 2;
  if (t === '三') return 3;
  if (t === '四') return 4;
  if (t === '五') return 5;
  return null;
}

const picks = [];
for (const date of dates) {
  const fp = path.join(ROOT, `data/backtest/v17/${date.slice(0,4)}/backtest-v17-${date}.json`);
  if (!fs.existsSync(fp)) continue;
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const div = loadDividends(date);
  const res = loadResults(date);
  if (!res) continue;

  for (const race of data.races) {
    if (!race.recommend || !race.actualTop3 || race.actualTop3.length < 3) continue;
    const tier = race.recommendations?.tier;
    if (!tier) continue;

    const top3 = race.actualTop3;
    const top2 = top3.slice(0, 2);
    const t12 = race.recommend.qinT12.combo.split(',');
    const banker = race.recommend.qinBanker.map(b => b.combo.split(','));
    const inTop2 = (no) => top2.includes(no);
    const inTop3 = (no) => top3.includes(no);
    const pair2 = (p) => inTop2(p[0]) && inTop2(p[1]);
    const pair3 = (p) => inTop3(p[0]) && inTop3(p[1]);
    const qinHit = banker.some(pair2);
    const pqBankerHits = banker.filter(pair3);
    const qinPay = qinHit ? findPayout(div, race.raceNo, top2, '連贏') : 0;
    let pqPay = 0;
    for (const p of pqBankerHits) pqPay += findPayout(div, race.raceNo, p, '位置Q');

    // Find race in results-full
    const resRace = res.races.find(rr => rr.raceNo === race.raceNo);
    if (!resRace) continue;
    const top1Runner = resRace.runners.find(rr => rr.no === race.recommend.qinT12.combo.split(',')[0]);
    if (!top1Runner) continue;

    const top1Sc = race.v17Ranking[0];
    const top2Sc = race.v17Ranking[1];
    const scoreGap = (top2Sc?.distAvgPlace ?? 99) - (top1Sc?.distAvgPlace ?? 99);

    picks.push({
      date,
      raceNo: race.raceNo,
      tier,
      fieldSize: resRace.runners.length,
      classN: classNum(resRace.meta?.className),
      distance: resRace.meta?.distance || 0,
      jockey: top1Runner.jockey,
      trainer: top1Runner.trainer,
      jTier: jockeyTier(top1Runner.jockey),
      tTier: trainerTier(top1Runner.trainer),
      draw: top1Runner.draw,
      scoreGap,
      ratingDelta: top1Sc.ratingDelta,
      last1lbw: top1Sc.last1lbw,
      avgLBW3: top1Sc.avgLBW3,
      qinSinglePnl: (qinHit ? qinPay * STAKE / 10 : 0) - STAKE,    // single uses qinT12, but it's same combo as banker[0]; qinT12 hit ≡ banker[0] hit so check directly
      qinSingleHit: pair2(t12),
      qinBankerPnl: (qinHit ? qinPay * STAKE / 10 : 0) - STAKE * 2,
      qinBankerHit: qinHit,
      pqBankerPnl: (pqPay * STAKE / 10) - STAKE * 2,
      pqBankerHit: pqBankerHits.length > 0,
    });
  }
}

console.log(`\nTotal picks: ${picks.length} 場`);

// Recompute single PnL (qinT12 is banker[0] anyway)
for (const p of picks) {
  // qinSinglePnl already correct because we used qinHit which is broader; but single only uses qinT12 = banker[0]. Need to re-check.
  // Actually: qinT12 hit ≡ pair2(t12). qinBankerHit ≡ banker.some(pair2). They differ when banker[1] hits but t12 doesn't.
  // Recompute single from t12:
  // already set qinSingleHit; recompute pnl: (hit ? same payout : 0) - STAKE
  const single = p.qinSingleHit ? p.qinBankerPnl + STAKE * 2 : 0;  // payout from banker (single uses t12 = banker[0])
  // safer: just re-derive
}
// Simpler: just trust that hit qinSingleHit means same payout as banker hit (because if t12 hit it's same combo)
for (const p of picks) {
  if (p.qinSingleHit) {
    // payout = qinBankerPnl + STAKE*2 (because banker stake 2x and same payout)
    const payout = p.qinBankerPnl + STAKE * 2;
    p.qinSinglePnl = payout - STAKE;
  } else {
    p.qinSinglePnl = -STAKE;
  }
}

function summarize(label, rows, betKey, stakeMul) {
  const stake = rows.length * STAKE * stakeMul;
  const pnl = rows.reduce((s, r) => s + r[betKey], 0);
  const hits = rows.filter(r => r[betKey] > -STAKE * stakeMul).length;  // not -100% loss → hit
  const roi = stake > 0 ? pnl / stake * 100 : 0;
  const hr = rows.length > 0 ? hits / rows.length * 100 : 0;
  return { label, plays: rows.length, hits, hitRate: hr, pnl, roi };
}

function printTable(header, rows, betKey, stakeMul) {
  console.log(`\n## ${header} (${betKey === 'qinSinglePnl' ? '連贏單注' : betKey === 'qinBankerPnl' ? '連贏膽拖' : '位Q膽拖'})`);
  console.log('| 條件 | 場 | 中 | 中率 | 盈虧 | ROI |');
  console.log('|---|---:|---:|---:|---:|---:|');
  for (const [name, subset] of rows) {
    const s = summarize(name, subset, betKey, stakeMul);
    console.log(`| ${name} | ${s.plays} | ${s.hits} | ${s.hitRate.toFixed(1)}% | ${s.pnl >= 0 ? '+' : ''}$${Math.round(s.pnl).toLocaleString()} | ${s.roi >= 0 ? '+' : ''}${s.roi.toFixed(1)}% |`);
  }
}

// ===== Sweeps =====

// Score gap
const gapBuckets = [
  ['gap = 0', picks.filter(p => p.scoreGap === 0)],
  ['gap 0-0.3', picks.filter(p => p.scoreGap > 0 && p.scoreGap <= 0.3)],
  ['gap 0.3-0.6', picks.filter(p => p.scoreGap > 0.3 && p.scoreGap <= 0.6)],
  ['gap 0.6-1.0', picks.filter(p => p.scoreGap > 0.6 && p.scoreGap <= 1.0)],
  ['gap 1.0+', picks.filter(p => p.scoreGap > 1.0)],
];
printTable('Score gap (top1 vs top2 distAvgPlace 差)', gapBuckets, 'qinSinglePnl', 1);
printTable('Score gap', gapBuckets, 'qinBankerPnl', 2);

// Field size
const fieldBuckets = [
  ['field ≤ 8', picks.filter(p => p.fieldSize <= 8)],
  ['field 9-10', picks.filter(p => p.fieldSize >= 9 && p.fieldSize <= 10)],
  ['field 11-12', picks.filter(p => p.fieldSize >= 11 && p.fieldSize <= 12)],
  ['field 13-14', picks.filter(p => p.fieldSize >= 13 && p.fieldSize <= 14)],
];
printTable('Field size', fieldBuckets, 'qinSinglePnl', 1);
printTable('Field size', fieldBuckets, 'qinBankerPnl', 2);

// Class
const classBuckets = [
  ['Class 1', picks.filter(p => p.classN === 1)],
  ['Class 2', picks.filter(p => p.classN === 2)],
  ['Class 3', picks.filter(p => p.classN === 3)],
  ['Class 4', picks.filter(p => p.classN === 4)],
  ['Class 5', picks.filter(p => p.classN === 5)],
];
printTable('Class', classBuckets, 'qinSinglePnl', 1);

// Jockey tier
const jockeyBuckets = [
  ['elite (≥12% wr)', picks.filter(p => p.jTier === 'elite')],
  ['good (8-12%)', picks.filter(p => p.jTier === 'good')],
  ['below (<8%)', picks.filter(p => p.jTier === 'below')],
  ['unknown (<100 runs)', picks.filter(p => p.jTier === 'unknown')],
];
printTable('Jockey tier', jockeyBuckets, 'qinSinglePnl', 1);
printTable('Jockey tier', jockeyBuckets, 'qinBankerPnl', 2);

// Trainer tier
const trainerBuckets = [
  ['elite (≥10% wr)', picks.filter(p => p.tTier === 'elite')],
  ['good (7-10%)', picks.filter(p => p.tTier === 'good')],
  ['below (<7%)', picks.filter(p => p.tTier === 'below')],
];
printTable('Trainer tier', trainerBuckets, 'qinSinglePnl', 1);

// Draw（檔位）
const drawBuckets = [
  ['draw 1-3', picks.filter(p => p.draw >= 1 && p.draw <= 3)],
  ['draw 4-6', picks.filter(p => p.draw >= 4 && p.draw <= 6)],
  ['draw 7-9', picks.filter(p => p.draw >= 7 && p.draw <= 9)],
  ['draw 10+', picks.filter(p => p.draw >= 10)],
];
printTable('Top1 draw（檔位）', drawBuckets, 'qinSinglePnl', 1);

// Distance
const distBuckets = [
  ['dist 1000-1200', picks.filter(p => p.distance >= 1000 && p.distance <= 1200)],
  ['dist 1400', picks.filter(p => p.distance === 1400)],
  ['dist 1600', picks.filter(p => p.distance === 1600)],
  ['dist 1800', picks.filter(p => p.distance === 1800)],
  ['dist 2000+', picks.filter(p => p.distance >= 2000)],
];
printTable('Distance', distBuckets, 'qinSinglePnl', 1);

// ===== Combo: 最佳組合搜索 =====
console.log('\n## Combo sweep（單條件 → 多條件）');

const comboTests = [
  ['Tier B + jockey elite', picks.filter(p => p.tier === 'B' && p.jTier === 'elite')],
  ['Tier B + jockey elite/good', picks.filter(p => p.tier === 'B' && (p.jTier === 'elite' || p.jTier === 'good'))],
  ['Tier B + trainer elite', picks.filter(p => p.tier === 'B' && p.tTier === 'elite')],
  ['Tier B + scoreGap ≥ 0.3', picks.filter(p => p.tier === 'B' && p.scoreGap >= 0.3)],
  ['Tier B + scoreGap ≥ 0.6', picks.filter(p => p.tier === 'B' && p.scoreGap >= 0.6)],
  ['Tier B + field ≥ 10', picks.filter(p => p.tier === 'B' && p.fieldSize >= 10)],
  ['Tier B + field ≤ 12', picks.filter(p => p.tier === 'B' && p.fieldSize <= 12)],
  ['Tier B + jockey elite/good + scoreGap ≥ 0.3', picks.filter(p => p.tier === 'B' && (p.jTier === 'elite' || p.jTier === 'good') && p.scoreGap >= 0.3)],
  ['Tier B + jockey elite/good + scoreGap ≥ 0.6', picks.filter(p => p.tier === 'B' && (p.jTier === 'elite' || p.jTier === 'good') && p.scoreGap >= 0.6)],
  ['Tier B + jockey elite/good + trainer not below', picks.filter(p => p.tier === 'B' && (p.jTier === 'elite' || p.jTier === 'good') && p.tTier !== 'below')],
  ['Tier B + jockey not below + trainer not below + scoreGap ≥ 0.3', picks.filter(p => p.tier === 'B' && p.jTier !== 'below' && p.tTier !== 'below' && p.scoreGap >= 0.3)],
  ['Tier B + (j elite OR scoreGap ≥ 0.6)', picks.filter(p => p.tier === 'B' && (p.jTier === 'elite' || p.scoreGap >= 0.6))],
  ['Tier B + class 3-5 + jockey not below', picks.filter(p => p.tier === 'B' && p.classN >= 3 && p.jTier !== 'below')],
  ['baseline V17-A 全部', picks],
  ['baseline V17-B only', picks.filter(p => p.tier === 'B')],
];

console.log('\n### 連贏單注');
console.log('| 條件 | 場 | 中 | 中率 | 盈虧 | ROI |');
console.log('|---|---:|---:|---:|---:|---:|');
for (const [name, subset] of comboTests) {
  const s = summarize(name, subset, 'qinSinglePnl', 1);
  console.log(`| ${name} | ${s.plays} | ${s.hits} | ${s.hitRate.toFixed(1)}% | ${s.pnl >= 0 ? '+' : ''}$${Math.round(s.pnl).toLocaleString()} | ${s.roi >= 0 ? '+' : ''}${s.roi.toFixed(1)}% |`);
}

console.log('\n### 連贏膽拖');
console.log('| 條件 | 場 | 中 | 中率 | 盈虧 | ROI |');
console.log('|---|---:|---:|---:|---:|---:|');
for (const [name, subset] of comboTests) {
  const s = summarize(name, subset, 'qinBankerPnl', 2);
  console.log(`| ${name} | ${s.plays} | ${s.hits} | ${s.hitRate.toFixed(1)}% | ${s.pnl >= 0 ? '+' : ''}$${Math.round(s.pnl).toLocaleString()} | ${s.roi >= 0 ? '+' : ''}${s.roi.toFixed(1)}% |`);
}

console.log('\n### 位置Q膽拖');
console.log('| 條件 | 場 | 中 | 中率 | 盈虧 | ROI |');
console.log('|---|---:|---:|---:|---:|---:|');
for (const [name, subset] of comboTests) {
  const s = summarize(name, subset, 'pqBankerPnl', 2);
  console.log(`| ${name} | ${s.plays} | ${s.hits} | ${s.hitRate.toFixed(1)}% | ${s.pnl >= 0 ? '+' : ''}$${Math.round(s.pnl).toLocaleString()} | ${s.roi >= 0 ? '+' : ''}${s.roi.toFixed(1)}% |`);
}

fs.writeFileSync(path.join(ROOT, 'data/v17-feature-sweep.json'), JSON.stringify({ picks, sortedJ, sortedT }, null, 2), 'utf8');
console.log('\nWrote data/v17-feature-sweep.json');
