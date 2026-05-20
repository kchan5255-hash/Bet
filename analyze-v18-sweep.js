// analyze-v18-sweep.js
// V18 三方向綜合 sweep:
//   1. Score threshold sweep (S/A/B 不同 cutoff)
//   2. Distance specialty: jockey/trainer 喺 sprint/middle/staying 嘅勝率
//   3. Odds momentum: top1 過去 3 場平均 odds 降低 = 走熱（trainer 有信心）

const fs = require('fs');
const path = require('path');

const ROOT = 'd:/AI/Bet';
const STAKE = 100;

function loadDiv(date) {
  const fp = path.join(ROOT, 'data/dividends/' + date.slice(0,4) + '/dividends-' + date + '.json');
  return fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf8')) : null;
}
function findPay(div, raceNo, pair, type) {
  if (!div) return 0;
  const r = div.races.find(x => x.raceNo === raceNo);
  if (!r) return 0;
  const list = r.dividends?.[type] || [];
  const k = pair.slice().sort().join(',');
  for (const d of list) {
    if (d.combo.split(',').sort().join(',') === k) return d.amount;
  }
  return 0;
}
function parseDateDMY(v) {
  const m = String(v||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const yr = m[3].length === 4 ? Number(m[3]) : 2000 + Number(m[3]);
  return new Date(Date.UTC(yr, Number(m[2])-1, Number(m[1])));
}

// ===== Step 1: 計每個 jockey/trainer 嘅 distance specialty =====
const distBucket = (d) => {
  if (d <= 1200) return 'sprint';
  if (d <= 1600) return 'middle';
  return 'staying';
};

const jSpec = new Map();
const tSpec = new Map();
function addSpec(map, name, bucket, won) {
  if (!map.has(name)) map.set(name, { sprint:{r:0,w:0}, middle:{r:0,w:0}, staying:{r:0,w:0}, all:{r:0,w:0} });
  const e = map.get(name);
  e[bucket].r++; if (won) e[bucket].w++;
  e.all.r++; if (won) e.all.w++;
}

// ===== Step 2: 載 results 計 distance specialty =====
const dates = [];
for (const yr of ['2024','2025','2026']) {
  const dir = path.join(ROOT, 'data/results/' + yr);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) dates.push(m[1]);
  }
}
dates.sort();

for (const date of dates) {
  const fp = path.join(ROOT, 'data/results/' + date.slice(0,4) + '/results-full-' + date + '.json');
  if (!fs.existsSync(fp)) continue;
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  for (const race of data.races) {
    const dist = Number(race.meta?.distance) || 0;
    if (!dist) continue;
    const bucket = distBucket(dist);
    for (const r of race.runners || []) {
      const plc = parseInt(r.plc, 10);
      if (!Number.isFinite(plc)) continue;
      const won = plc === 1;
      if (r.jockey) addSpec(jSpec, r.jockey, bucket, won);
      if (r.trainer) addSpec(tSpec, r.trainer, bucket, won);
    }
  }
}

// ===== Step 3: 載 horses 計每隻馬嘅 odds momentum (上 3 場平均 odds) =====
const HORSES_FILES = [
  'horses-all.json','horses-janmar.json','horses-apr5days.json',
  'horses-3days.json','horses-2026-05-09.json','horses-2026-05-17.json',
  'horses-513-missing.json',
];
const horseByCode = new Map();
for (const fn of HORSES_FILES) {
  const fp = path.join(ROOT, 'data/horses/' + fn);
  if (!fs.existsSync(fp)) continue;
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  for (const h of data.horses || []) {
    if (!horseByCode.has(h.code) || (h.records?.length || 0) > (horseByCode.get(h.code).records?.length || 0)) {
      horseByCode.set(h.code, h);
    }
  }
}

function oddsFeatures(code, raceDate) {
  const h = horseByCode.get(code);
  if (!h?.records?.length) return { last3OddsAvg: null, lastOdds: null, oddsTrend: null };
  const past = h.records.filter(r => {
    const d = parseDateDMY(r.date);
    return d && d < raceDate && r.odds && Number(r.odds) > 0;
  });
  if (!past.length) return { last3OddsAvg: null, lastOdds: null, oddsTrend: null };
  const last3 = past.slice(0, 3).map(r => Number(r.odds));
  const lastOdds = last3[0];
  const last3Avg = last3.reduce((a,b)=>a+b,0) / last3.length;
  // trend = 上 1 場 odds vs 上 2-3 場平均：細 = 走熱
  let trend = null;
  if (last3.length >= 3) {
    const old = (last3[1] + last3[2]) / 2;
    trend = lastOdds - old;  // 負數 = 公眾上次比之前更睇好
  }
  return { last3OddsAvg: last3Avg, lastOdds, oddsTrend: trend };
}

// ===== Step 4: 載 V18 backtest =====
const picks = [];
for (const date of dates) {
  const fp = path.join(ROOT, 'data/backtest/v18/' + date.slice(0,4) + '/backtest-v18-' + date + '.json');
  if (!fs.existsSync(fp)) continue;
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const div = loadDiv(date);
  const resFp = path.join(ROOT, 'data/results/' + date.slice(0,4) + '/results-full-' + date + '.json');
  if (!fs.existsSync(resFp)) continue;
  const res = JSON.parse(fs.readFileSync(resFp, 'utf8'));
  const raceDate = new Date(date + 'T00:00:00+08:00');

  for (const race of data.races) {
    if (!race.recommend?.bets?.length || !race.actualTop3 || race.actualTop3.length < 3) continue;
    const tier = race.v18?.tier;
    if (!tier) continue;

    const resRace = res.races.find(r => r.raceNo === race.raceNo);
    if (!resRace) continue;
    const t12 = race.recommend.qinT12.combo.split(',');
    const top1Runner = resRace.runners.find(r => String(r.no) === t12[0]);
    if (!top1Runner) continue;

    const dist = Number(resRace.meta?.distance) || 0;
    const bucket = distBucket(dist);
    const jSpecData = jSpec.get(top1Runner.jockey);
    const tSpecData = tSpec.get(top1Runner.trainer);
    const jBucketWR = jSpecData?.[bucket]?.r >= 30 ? jSpecData[bucket].w / jSpecData[bucket].r : null;
    const tBucketWR = tSpecData?.[bucket]?.r >= 30 ? tSpecData[bucket].w / tSpecData[bucket].r : null;

    const od = oddsFeatures(top1Runner.code, raceDate);

    const top2Actual = race.actualTop3.slice(0,2);
    const top3Actual = race.actualTop3;
    const banker = race.recommend.bets.flatMap(b => {
      if (b.t2 && b.t3) return [[b.t1, b.t2], [b.t1, b.t3]];
      if (b.t2) return [[b.t1, b.t2]];
      return [];
    });
    const inT2 = n => top2Actual.includes(n);
    const inT3 = n => top3Actual.includes(n);
    const p2 = p => inT2(p[0]) && inT2(p[1]);
    const p3 = p => inT3(p[0]) && inT3(p[1]);
    const sHit = p2(t12);
    const bHit = banker.some(p2);
    const pqHits = banker.filter(p3);
    const qPay = (sHit||bHit) ? findPay(div, race.raceNo, top2Actual, '連贏') : 0;
    let pqPay = 0;
    for (const p of pqHits) pqPay += findPay(div, race.raceNo, p, '位置Q');

    picks.push({
      date,
      raceNo: race.raceNo,
      tier,
      v18Score: race.v18.score,
      stakeMul: race.v18.stakeMul,
      jt: race.v18.jtCombo,
      bucket,
      dist,
      class: race.v18.class,
      draw: race.v18.draw,
      jBucketWR,
      tBucketWR,
      lastOdds: od.lastOdds,
      last3OddsAvg: od.last3OddsAvg,
      oddsTrend: od.oddsTrend,
      sHit, bHit, pqHits: pqHits.length > 0,
      qPay, pqPay,
      bankerCount: banker.length,
    });
  }
}

console.log(`Total V18 picks: ${picks.length}`);

function tally(rows, betType) {
  let stake = 0, payout = 0, hits = 0;
  for (const r of rows) {
    if (betType === 'single') {
      stake += STAKE * r.stakeMul;
      payout += r.sHit ? r.qPay * STAKE * r.stakeMul / 10 : 0;
      if (r.sHit) hits++;
    } else if (betType === 'banker') {
      stake += STAKE * r.stakeMul * r.bankerCount;
      payout += r.bHit ? r.qPay * STAKE * r.stakeMul / 10 : 0;
      if (r.bHit) hits++;
    } else if (betType === 'pq') {
      stake += STAKE * r.stakeMul * r.bankerCount;
      payout += r.pqPay * STAKE * r.stakeMul / 10;
      if (r.pqHits) hits++;
    }
  }
  const pnl = payout - stake;
  const roi = stake ? pnl/stake*100 : 0;
  const hr = rows.length ? hits/rows.length*100 : 0;
  return { plays: rows.length, hits, hr, stake, payout, pnl, roi };
}

function yrSplit(rows, betType) {
  const yrs = {};
  for (const r of rows) {
    const yr = r.date.slice(0,4);
    if (!yrs[yr]) yrs[yr] = [];
    yrs[yr].push(r);
  }
  const out = {};
  for (const yr of Object.keys(yrs).sort()) out[yr] = tally(yrs[yr], betType);
  return out;
}

function runBucket(name, subset) {
  const t = tally(subset, 'banker');
  const ys = yrSplit(subset, 'banker');
  const yrCells = ['2024','2025','2026'].map(y => ys[y] ? `${ys[y].roi>=0?'+':''}${ys[y].roi.toFixed(0)}%` : 'n/a');
  console.log(`| ${name} | ${t.plays} | ${t.hits} | ${t.hr.toFixed(1)}% | ${t.roi>=0?'+':''}${t.roi.toFixed(1)}% | ${yrCells.join(' ')} |`);
}

// ===== Sweep =====
console.log('\n## A) V18 Score threshold sweep（連贏膽拖）');
console.log('| 條件 | 場 | 中 | 中率 | ROI | 三年 |');
console.log('|---|---:|---:|---:|---:|---|');
runBucket('V18 all (S+A+B)', picks);
runBucket('V18 score ≥ 0.5', picks.filter(p => p.v18Score >= 0.5));
runBucket('V18 score ≥ 1', picks.filter(p => p.v18Score >= 1));
runBucket('V18 score ≥ 1.5', picks.filter(p => p.v18Score >= 1.5));
runBucket('V18 score ≥ 2', picks.filter(p => p.v18Score >= 2));
runBucket('V18 score 1-2.5 (medium)', picks.filter(p => p.v18Score >= 1 && p.v18Score <= 2.5));
runBucket('V18 score 0.5-2.5', picks.filter(p => p.v18Score >= 0.5 && p.v18Score <= 2.5));

console.log('\n## B) Distance specialty 篩選（連贏膽拖）');
console.log('| 條件 | 場 | 中 | 中率 | ROI | 三年 |');
console.log('|---|---:|---:|---:|---:|---|');
runBucket('Sprint 1000-1200', picks.filter(p => p.bucket === 'sprint'));
runBucket('Middle 1400-1600', picks.filter(p => p.bucket === 'middle'));
runBucket('Staying 1800+', picks.filter(p => p.bucket === 'staying'));
runBucket('jockey 該距離 WR ≥ 12%', picks.filter(p => p.jBucketWR != null && p.jBucketWR >= 0.12));
runBucket('jockey 該距離 WR ≥ 8%', picks.filter(p => p.jBucketWR != null && p.jBucketWR >= 0.08));
runBucket('trainer 該距離 WR ≥ 10%', picks.filter(p => p.tBucketWR != null && p.tBucketWR >= 0.10));
runBucket('jt 該距離 都 ≥ 8%/10%', picks.filter(p => p.jBucketWR >= 0.08 && p.tBucketWR >= 0.10));

console.log('\n## C) Odds momentum 篩選（top1 上場 odds vs 之前）');
console.log('| 條件 | 場 | 中 | 中率 | ROI | 三年 |');
console.log('|---|---:|---:|---:|---:|---|');
const haveOdds = picks.filter(p => p.lastOdds != null);
console.log(`(coverage: ${haveOdds.length}/${picks.length} = ${(haveOdds.length/picks.length*100).toFixed(0)}%)`);
runBucket('lastOdds < 5 (走熱)', picks.filter(p => p.lastOdds != null && p.lastOdds < 5));
runBucket('lastOdds 5-10', picks.filter(p => p.lastOdds != null && p.lastOdds >= 5 && p.lastOdds < 10));
runBucket('lastOdds 10-20', picks.filter(p => p.lastOdds != null && p.lastOdds >= 10 && p.lastOdds < 20));
runBucket('lastOdds ≥ 20 (走冷)', picks.filter(p => p.lastOdds != null && p.lastOdds >= 20));
runBucket('oddsTrend < -3 (近期走熱)', picks.filter(p => p.oddsTrend != null && p.oddsTrend < -3));
runBucket('oddsTrend > 3 (近期走冷)', picks.filter(p => p.oddsTrend != null && p.oddsTrend > 3));

console.log('\n## D) 組合 (sweet spot search)');
console.log('| 條件 | 場 | 中 | 中率 | ROI | 三年 |');
console.log('|---|---:|---:|---:|---:|---|');
runBucket('V18 score ≥ 1', picks.filter(p => p.v18Score >= 1));
runBucket('V18 score ≥ 1 + jBucketWR ≥ 8%', picks.filter(p => p.v18Score >= 1 && p.jBucketWR >= 0.08));
runBucket('V18 score ≥ 1 + tBucketWR ≥ 10%', picks.filter(p => p.v18Score >= 1 && p.tBucketWR >= 0.10));
runBucket('V18 score ≥ 1 + lastOdds < 10', picks.filter(p => p.v18Score >= 1 && p.lastOdds != null && p.lastOdds < 10));
runBucket('V18 score ≥ 1 + lastOdds ≥ 5', picks.filter(p => p.v18Score >= 1 && p.lastOdds >= 5));
runBucket('V18 A only + jBucketWR ≥ 8%', picks.filter(p => p.tier === 'A' && p.jBucketWR >= 0.08));
runBucket('V18 A only + lastOdds < 15', picks.filter(p => p.tier === 'A' && p.lastOdds != null && p.lastOdds < 15));
runBucket('V18 A only + middle/staying', picks.filter(p => p.tier === 'A' && p.bucket !== 'sprint'));
runBucket('V18 score ≥ 1 + jBucket ≥ 8% + lastOdds 5-30', picks.filter(p => p.v18Score >= 1 && p.jBucketWR >= 0.08 && p.lastOdds >= 5 && p.lastOdds < 30));
runBucket('V18 ≥ 1 + jBucket ≥ 10% + middle/staying', picks.filter(p => p.v18Score >= 1 && p.jBucketWR >= 0.10 && p.bucket !== 'sprint'));

console.log('\n## E) Single (連贏單注) — V18 ≥ 1 sweet spots');
function runBucket2(name, subset) {
  const t = tally(subset, 'single');
  const ys = yrSplit(subset, 'single');
  const yrCells = ['2024','2025','2026'].map(y => ys[y] ? `${ys[y].roi>=0?'+':''}${ys[y].roi.toFixed(0)}%` : 'n/a');
  console.log(`| ${name} | ${t.plays} | ${t.hits} | ${t.hr.toFixed(1)}% | ${t.roi>=0?'+':''}${t.roi.toFixed(1)}% | ${yrCells.join(' ')} |`);
}
console.log('| 條件 | 場 | 中 | 中率 | ROI | 三年 |');
console.log('|---|---:|---:|---:|---:|---|');
runBucket2('V18 score ≥ 1', picks.filter(p => p.v18Score >= 1));
runBucket2('V18 A only', picks.filter(p => p.tier === 'A'));
runBucket2('V18 A + jBucket ≥ 8%', picks.filter(p => p.tier === 'A' && p.jBucketWR >= 0.08));
runBucket2('V18 ≥ 1 + middle/staying', picks.filter(p => p.v18Score >= 1 && p.bucket !== 'sprint'));

fs.writeFileSync(path.join(ROOT, 'data/v18-sweep.json'), JSON.stringify({ picks }), 'utf8');
console.log('\nWrote data/v18-sweep.json');
