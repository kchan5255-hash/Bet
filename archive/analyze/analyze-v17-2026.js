// analyze-v17-2026.js
// 淨計 2026 年（2026-01-01 到 2026-05-17）V17 連贏 + 位置Q ROI

const fs = require('fs');
const path = require('path');

const ROOT = 'd:/AI/Bet';
const STAKE = 100;

function loadDividends(date) {
  const yr = date.slice(0, 4);
  const fp = path.join(ROOT, `data/dividends/${yr}/dividends-${date}.json`);
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

function evaluateRace(rec, race, divData) {
  const top3 = race.actualTop3.slice(0, 3);
  if (top3.length < 3) return null;
  const top2 = top3.slice(0, 2);

  const t12 = rec.qinT12.combo.split(',');
  const banker = rec.qinBanker.map(b => b.combo.split(','));

  const inTop2 = (no) => top2.includes(no);
  const inTop3 = (no) => top3.includes(no);
  const pairInTop2 = (p) => inTop2(p[0]) && inTop2(p[1]);
  const pairInTop3 = (p) => inTop3(p[0]) && inTop3(p[1]);

  // 連贏（top 2 in any order）
  const qinSingleHit = pairInTop2(t12);
  const qinBankerHits = banker.filter(pairInTop2);
  let qinPayoutPerStake = 0;
  if (qinSingleHit || qinBankerHits.length > 0) {
    qinPayoutPerStake = findPayout(divData, race.raceNo, top2, '連贏');
  }

  // 位置Q（pair both in top3）
  const pqSingleHit = pairInTop3(t12);
  const pqBankerHits = banker.filter(pairInTop3);
  let pqSinglePayoutPerStake = 0;
  if (pqSingleHit) pqSinglePayoutPerStake = findPayout(divData, race.raceNo, t12, '位置Q');
  let pqBankerPayoutPerStake = 0;
  for (const p of pqBankerHits) pqBankerPayoutPerStake += findPayout(divData, race.raceNo, p, '位置Q');

  return {
    qinSingleStake: STAKE,
    qinSinglePayout: qinSingleHit ? qinPayoutPerStake * STAKE / 10 : 0,
    qinBankerStake: STAKE * 2,
    qinBankerPayout: qinBankerHits.length > 0 ? qinPayoutPerStake * STAKE / 10 : 0,
    pqSingleStake: STAKE,
    pqSinglePayout: pqSinglePayoutPerStake * STAKE / 10,
    pqBankerStake: STAKE * 2,
    pqBankerPayout: pqBankerPayoutPerStake * STAKE / 10,
  };
}

function summarize(label, rows) {
  const stake = rows.reduce((s, r) => s + r.stake, 0);
  const payout = rows.reduce((s, r) => s + r.payout, 0);
  const pnl = payout - stake;
  const roi = stake > 0 ? (pnl / stake * 100) : 0;
  const hits = rows.filter(r => r.payout > 0).length;
  const hitRate = rows.length > 0 ? (hits / rows.length * 100) : 0;
  return { label, plays: rows.length, stake, payout, pnl, roi, hits, hitRate };
}

function maxDrawdown(rows) {
  const byDate = {};
  for (const r of rows) {
    if (!byDate[r.date]) byDate[r.date] = 0;
    byDate[r.date] += r.payout - r.stake;
  }
  const dates = Object.keys(byDate).sort();
  let cum = 0, peak = 0, maxDD = 0;
  let lossStreak = 0, winStreak = 0, maxLossStreak = 0, maxWinStreak = 0;
  let bestDay = { date: '', pnl: -Infinity };
  let worstDay = { date: '', pnl: Infinity };
  for (const d of dates) {
    const dp = byDate[d];
    cum += dp;
    if (dp > bestDay.pnl) bestDay = { date: d, pnl: dp };
    if (dp < worstDay.pnl) worstDay = { date: d, pnl: dp };
    if (cum > peak) peak = cum;
    const dd = cum - peak;
    if (dd < maxDD) maxDD = dd;
    if (dp < 0) { lossStreak++; winStreak = 0; if (lossStreak > maxLossStreak) maxLossStreak = lossStreak; }
    else if (dp > 0) { winStreak++; lossStreak = 0; if (winStreak > maxWinStreak) maxWinStreak = winStreak; }
  }
  return { maxDD, bestDay, worstDay, maxLossStreak, maxWinStreak, days: dates.length };
}

function monthBreak(rows) {
  const out = {};
  for (const r of rows) {
    const ym = r.date.slice(0, 7);
    if (!out[ym]) out[ym] = [];
    out[ym].push(r);
  }
  return Object.keys(out).sort().map(ym => summarize(ym, out[ym]));
}

// ===== main =====
const buckets = {
  A_all: { qinSingle: [], qinBanker: [], pqSingle: [], pqBanker: [] },
  B: { qinSingle: [], qinBanker: [], pqSingle: [], pqBanker: [] },
  C: { qinSingle: [], qinBanker: [], pqSingle: [], pqBanker: [] },
};

const dir = path.join(ROOT, 'data/backtest/v17/2026');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();

let raceCount = 0;
let dayCount = 0;
const dates = [];
for (const f of files) {
  const m = f.match(/(\d{4}-\d{2}-\d{2})/);
  if (!m) continue;
  const date = m[1];
  dates.push(date);
  dayCount++;
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const div = loadDividends(date);
  for (const race of data.races) {
    raceCount++;
    if (!race.recommend || !race.actualTop3 || race.actualTop3.length < 3) continue;
    const tier = race.recommendations?.tier;
    if (!tier) continue;
    const e = evaluateRace(race.recommend, race, div);
    if (!e) continue;

    const push = (key) => {
      buckets[key].qinSingle.push({ date, raceNo: race.raceNo, stake: e.qinSingleStake, payout: e.qinSinglePayout });
      buckets[key].qinBanker.push({ date, raceNo: race.raceNo, stake: e.qinBankerStake, payout: e.qinBankerPayout });
      buckets[key].pqSingle.push({ date, raceNo: race.raceNo, stake: e.pqSingleStake, payout: e.pqSinglePayout });
      buckets[key].pqBanker.push({ date, raceNo: race.raceNo, stake: e.pqBankerStake, payout: e.pqBankerPayout });
    };
    push('A_all');
    if (tier === 'B') push('B');
    if (tier === 'C') push('C');
  }
}

console.log('===== V17 — 淨 2026 年 =====');
console.log(`資料：${dayCount} 個 2026 賽馬日 / ${raceCount} 場 / ${dates[0]} ~ ${dates[dates.length - 1]}`);
console.log();

const sections = [
  { key: 'A_all', name: 'V17-A 全部 (rating ≥ 2)' },
  { key: 'B', name: 'V17-B only (rating + lbw ≤ 2)' },
  { key: 'C', name: 'V17-C only (rating + avgLBW3 ≤ 3, 唔過 B)' },
];
const betTypes = [
  { key: 'qinSingle', name: '連贏單注' },
  { key: 'qinBanker', name: '連贏膽拖' },
  { key: 'pqSingle', name: '位置Q單注' },
  { key: 'pqBanker', name: '位置Q膽拖' },
];

console.log('## 4 玩法總表');
console.log('| Tier (玩法) | 場 | 中 | 中率 | 流轉 | 派彩 | 盈虧 | ROI |');
console.log('|---|---:|---:|---:|---:|---:|---:|---:|');
for (const sec of sections) {
  for (const bt of betTypes) {
    const s = summarize(`${sec.name} (${bt.name})`, buckets[sec.key][bt.key]);
    if (s.plays === 0) continue;
    console.log(`| ${s.label} | ${s.plays} | ${s.hits} | ${s.hitRate.toFixed(2)}% | $${s.stake.toLocaleString()} | $${s.payout.toLocaleString()} | ${s.pnl >= 0 ? '+' : ''}$${s.pnl.toLocaleString()} | ${s.roi >= 0 ? '+' : ''}${s.roi.toFixed(2)}% |`);
  }
}

console.log();
console.log('## 月度 (V17-A 全部)');
for (const bt of betTypes) {
  console.log(`### ${bt.name}`);
  console.log('| 月 | 場 | 中 | ROI | 盈虧 |');
  console.log('|---|---:|---:|---:|---:|');
  for (const m of monthBreak(buckets.A_all[bt.key])) {
    console.log(`| ${m.label} | ${m.plays} | ${m.hits} | ${m.roi >= 0 ? '+' : ''}${m.roi.toFixed(1)}% | ${m.pnl >= 0 ? '+' : ''}$${m.pnl.toLocaleString()} |`);
  }
  console.log();
}

console.log('## 風險指標 (V17-A 全部)');
console.log('| 玩法 | 賽馬日 | 最大回撤 | 最佳一日 | 最差一日 | 連蝕 | 連中 |');
console.log('|---|---:|---:|---:|---:|---:|---:|');
for (const bt of betTypes) {
  const dd = maxDrawdown(buckets.A_all[bt.key]);
  console.log(`| ${bt.name} | ${dd.days} | $${dd.maxDD.toFixed(0)} | +$${dd.bestDay.pnl.toFixed(0)} (${dd.bestDay.date}) | $${dd.worstDay.pnl.toFixed(0)} (${dd.worstDay.date}) | ${dd.maxLossStreak} | ${dd.maxWinStreak} |`);
}

console.log();
console.log('## Sensitivity (V17-A 全部) — 剔走 Top-N 派彩日');
console.log('| 剔 N | 連贏單注 | 連贏膽拖 | 位置Q單注 | 位置Q膽拖 |');
console.log('|---|---|---|---|---|');
for (const N of [0, 1, 3, 5]) {
  const cells = betTypes.map(bt => {
    const s = summarize('', buckets.A_all[bt.key].slice().sort((a, b) => b.payout - a.payout).slice(N));
    return s.roi >= 0 ? `+${s.roi.toFixed(1)}%` : `${s.roi.toFixed(1)}%`;
  });
  console.log(`| ${N} | ${cells.join(' | ')} |`);
}

console.log();
console.log('## 派彩分佈（中咗時，V17-A 全部）');
console.log('| 玩法 | 中 | 最低 | 中位 | 平均 | 最高 |');
console.log('|---|---:|---:|---:|---:|---:|');
for (const bt of betTypes) {
  const wins = buckets.A_all[bt.key].filter(r => r.payout > 0).map(r => r.payout).sort((a, b) => a - b);
  if (!wins.length) continue;
  const med = wins[Math.floor(wins.length / 2)];
  const avg = wins.reduce((s, v) => s + v, 0) / wins.length;
  console.log(`| ${bt.name} | ${wins.length} | $${wins[0].toFixed(0)} | $${med.toFixed(0)} | $${avg.toFixed(0)} | $${wins[wins.length - 1].toFixed(0)} |`);
}

// V17-B 月度位置Q膽拖（最穩組合）
console.log();
console.log('## V17-B 月度（位置Q膽拖，最穩組合）');
console.log('| 月 | 場 | 中 | 中率 | ROI | 盈虧 |');
console.log('|---|---:|---:|---:|---:|---:|');
for (const m of monthBreak(buckets.B.pqBanker)) {
  console.log(`| ${m.label} | ${m.plays} | ${m.hits} | ${m.hitRate.toFixed(1)}% | ${m.roi >= 0 ? '+' : ''}${m.roi.toFixed(1)}% | ${m.pnl >= 0 ? '+' : ''}$${m.pnl.toLocaleString()} |`);
}

fs.writeFileSync(path.join(ROOT, 'data/v17-2026-summary.json'), JSON.stringify({
  meta: { dayCount, raceCount, firstDate: dates[0], lastDate: dates[dates.length - 1] },
  sections: Object.fromEntries(sections.map(sec => [sec.key, Object.fromEntries(betTypes.map(bt => [bt.key, {
    summary: summarize('', buckets[sec.key][bt.key]),
    monthly: monthBreak(buckets[sec.key][bt.key]),
    drawdown: maxDrawdown(buckets[sec.key][bt.key]),
  }]))])),
}, null, 2), 'utf8');
console.log();
console.log('Wrote data/v17-2026-summary.json');
