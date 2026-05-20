// analyze-v17-roi.js
// 將 V17 嘅 backtest output 同 dividends data join，計各 tier 嘅 ROI
//
// 連贏 = top 2 finishers in any order
// 單注 $100/場（qinT12 = top1-top2）
// 膽拖 = $100 × 2 注 = $200/場（top1-top2 + top1-top3）

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

function findQinPayout(divData, raceNo, top2) {
  if (!divData) return 0;
  const race = divData.races?.find(r => r.raceNo === raceNo);
  if (!race) return 0;
  const qin = race.dividends?.['連贏'] || [];
  const sortedKey = top2.slice().sort((a, b) => Number(a) - Number(b)).join(',');
  for (const d of qin) {
    const k = d.combo.split(',').map(s => s.trim()).sort((a, b) => Number(a) - Number(b)).join(',');
    if (k === sortedKey) return d.amount;
  }
  return 0;
}

function evaluateRace(rec, race, divData) {
  const top2Actual = race.actualTop3.slice(0, 2);
  if (top2Actual.length < 2) return null;

  const t12 = rec.qinT12.combo.split(',');
  const banker = rec.qinBanker.map(b => b.combo.split(','));

  const top2Sorted = top2Actual.slice().sort();
  const t12Sorted = t12.slice().sort();
  const singleHit = t12Sorted.join(',') === top2Sorted.join(',');

  const bankerHits = banker.filter(combo => combo.slice().sort().join(',') === top2Sorted.join(','));

  let payout = 0;
  if (singleHit || bankerHits.length > 0) {
    payout = findQinPayout(divData, race.raceNo, top2Actual);
  }

  return {
    singleStake: STAKE,
    singlePayout: singleHit ? (payout * STAKE / 10) : 0,  // 派彩係 per $10
    bankerStake: STAKE * 2,
    bankerPayout: bankerHits.length > 0 ? (payout * STAKE / 10) : 0,
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
  let cum = 0, peak = 0, maxDD = 0, peakDate = '', troughDate = '';
  let curDD = 0;
  let lossStreak = 0, winStreak = 0, maxLossStreak = 0, maxWinStreak = 0;
  // Group by date for daily PnL
  const byDate = {};
  for (const r of rows) {
    if (!byDate[r.date]) byDate[r.date] = 0;
    byDate[r.date] += r.payout - r.stake;
  }
  const dates = Object.keys(byDate).sort();
  let bestDay = { date: '', pnl: -Infinity };
  let worstDay = { date: '', pnl: Infinity };
  for (const d of dates) {
    const dailyPnl = byDate[d];
    cum += dailyPnl;
    if (dailyPnl > bestDay.pnl) bestDay = { date: d, pnl: dailyPnl };
    if (dailyPnl < worstDay.pnl) worstDay = { date: d, pnl: dailyPnl };
    if (cum > peak) { peak = cum; }
    const dd = cum - peak;
    if (dd < maxDD) { maxDD = dd; troughDate = d; }
    if (dailyPnl < 0) { lossStreak++; winStreak = 0; if (lossStreak > maxLossStreak) maxLossStreak = lossStreak; }
    else if (dailyPnl > 0) { winStreak++; lossStreak = 0; if (winStreak > maxWinStreak) maxWinStreak = winStreak; }
  }
  return { maxDD, bestDay, worstDay, maxLossStreak, maxWinStreak, days: dates.length };
}

function yearBreak(rows) {
  const out = {};
  for (const r of rows) {
    const yr = r.date.slice(0, 4);
    if (!out[yr]) out[yr] = [];
    out[yr].push(r);
  }
  const result = {};
  for (const yr of Object.keys(out)) {
    result[yr] = summarize(yr, out[yr]);
  }
  return result;
}

function monthBreak(rows) {
  const out = {};
  for (const r of rows) {
    const ym = r.date.slice(0, 7);
    if (!out[ym]) out[ym] = [];
    out[ym].push(r);
  }
  return Object.keys(out).sort().map(ym => ({ ...summarize(ym, out[ym]) }));
}

// ===== main =====
const rowsByTier = {
  A_only: { single: [], banker: [] },  // tier === 'A' (no B/C)
  B: { single: [], banker: [] },
  C: { single: [], banker: [] },
  A_all: { single: [], banker: [] },   // tier in (A,B,C) (anyone passing gate A)
};

const dates = [];
for (const yr of ['2024', '2025', '2026']) {
  const dir = path.join(ROOT, 'data/backtest/v17', yr);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) dates.push(m[1]);
  }
}
dates.sort();

let raceCount = 0;
for (const date of dates) {
  const fp = path.join(ROOT, `data/backtest/v17/${date.slice(0,4)}/backtest-v17-${date}.json`);
  if (!fs.existsSync(fp)) continue;
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const div = loadDividends(date);
  for (const race of data.races) {
    raceCount++;
    if (!race.recommend || !race.actualTop3 || race.actualTop3.length < 2) continue;
    const rec = race.recommend;
    const tier = race.recommendations?.tier;
    if (!tier) continue;

    const e = evaluateRace(rec, race, div);
    if (!e) continue;

    const sRow = { date, raceNo: race.raceNo, stake: e.singleStake, payout: e.singlePayout };
    const bRow = { date, raceNo: race.raceNo, stake: e.bankerStake, payout: e.bankerPayout };

    if (tier === 'A') {
      rowsByTier.A_only.single.push(sRow);
      rowsByTier.A_only.banker.push(bRow);
    }
    if (tier === 'B') {
      rowsByTier.B.single.push(sRow);
      rowsByTier.B.banker.push(bRow);
    }
    if (tier === 'C') {
      rowsByTier.C.single.push(sRow);
      rowsByTier.C.banker.push(bRow);
    }
    rowsByTier.A_all.single.push(sRow);
    rowsByTier.A_all.banker.push(bRow);
  }
}

// ===== Output =====
console.log('===== V17 完整 ROI 分析 =====');
console.log(`資料：${dates.length} 個賽馬日 / ${raceCount} 場 / 押注 $${STAKE}/注`);
console.log();

const sections = [
  { key: 'A_all', name: 'V17-A (全部 ratingDelta ≥ 2)' },
  { key: 'B', name: 'V17-B (only) (rating ≥ 2 + lbw ≤ 2)' },
  { key: 'C', name: 'V17-C (only) (rating ≥ 2 + avgLBW3 ≤ 3, 唔過 B)' },
  { key: 'A_only', name: 'V17-A only (rating ≥ 2 但唔過 B/C)' },
];

console.log('## Tier 總表（連贏單注 / 連贏膽拖）');
console.log('| Tier | 場數 | 流轉 | 中獎 | 中獎率 | 派彩 | 盈虧 | ROI |');
console.log('|---|---:|---:|---:|---:|---:|---:|---:|');
for (const sec of sections) {
  for (const bet of ['single', 'banker']) {
    const s = summarize(`${sec.name} (${bet === 'single' ? '單注' : '膽拖'})`, rowsByTier[sec.key][bet]);
    console.log(`| ${s.label} | ${s.plays} | $${s.stake.toLocaleString()} | ${s.hits} | ${s.hitRate.toFixed(2)}% | $${s.payout.toLocaleString()} | ${s.pnl >= 0 ? '+' : ''}$${s.pnl.toLocaleString()} | ${s.roi >= 0 ? '+' : ''}${s.roi.toFixed(2)}% |`);
  }
}

console.log();
console.log('## 年度 ROI');
console.log('| Tier (玩法) | 2024 | 2025 | 2026 |');
console.log('|---|---|---|---|');
for (const sec of sections) {
  for (const bet of ['single', 'banker']) {
    const yb = yearBreak(rowsByTier[sec.key][bet]);
    const cells = ['2024', '2025', '2026'].map(yr => {
      const y = yb[yr];
      if (!y) return 'n/a';
      return `${y.roi >= 0 ? '+' : ''}${y.roi.toFixed(1)}% (${y.plays}/${y.hits})`;
    });
    console.log(`| ${sec.name} (${bet === 'single' ? '單注' : '膽拖'}) | ${cells.join(' | ')} |`);
  }
}

console.log();
console.log('## 風險指標（V17-A 全部）');
for (const bet of ['single', 'banker']) {
  const dd = maxDrawdown(rowsByTier.A_all[bet]);
  const label = bet === 'single' ? '連贏單注' : '連贏膽拖';
  console.log(`- ${label}：最大回撤 $${dd.maxDD.toFixed(0)} / 最佳一日 +$${dd.bestDay.pnl.toFixed(0)} (${dd.bestDay.date}) / 最差一日 $${dd.worstDay.pnl.toFixed(0)} (${dd.worstDay.date}) / 連蝕 ${dd.maxLossStreak} 日 / 連中 ${dd.maxWinStreak} 日`);
}

console.log();
console.log('## V17-B (only) 月度（連贏單注）');
console.log('| 月份 | 場 | 中 | ROI | 盈虧 |');
console.log('|---|---:|---:|---:|---:|');
for (const m of monthBreak(rowsByTier.B.single)) {
  if (m.plays === 0) continue;
  console.log(`| ${m.label} | ${m.plays} | ${m.hits} | ${m.roi >= 0 ? '+' : ''}${m.roi.toFixed(1)}% | ${m.pnl >= 0 ? '+' : ''}$${m.pnl.toLocaleString()} |`);
}

// 派彩 distribution
function payoutStats(rows) {
  const wins = rows.filter(r => r.payout > 0).map(r => r.payout);
  if (!wins.length) return null;
  wins.sort((a, b) => a - b);
  const min = wins[0], max = wins[wins.length - 1];
  const median = wins[Math.floor(wins.length / 2)];
  const avg = wins.reduce((s, v) => s + v, 0) / wins.length;
  return { min, median, avg, max, n: wins.length };
}

console.log();
console.log('## 派彩分布（中咗時）');
console.log('| Tier (玩法) | 中獎 | 最低 | 中位數 | 平均 | 最高 |');
console.log('|---|---:|---:|---:|---:|---:|');
for (const sec of sections) {
  for (const bet of ['single', 'banker']) {
    const ps = payoutStats(rowsByTier[sec.key][bet]);
    if (!ps) continue;
    console.log(`| ${sec.name} (${bet === 'single' ? '單注' : '膽拖'}) | ${ps.n} | $${ps.min.toFixed(0)} | $${ps.median.toFixed(0)} | $${ps.avg.toFixed(0)} | $${ps.max.toFixed(0)} |`);
  }
}

// Sensitivity: top-N 派彩剔除
console.log();
console.log('## V17-A 全部 sensitivity (剔走 Top N 派彩)');
console.log('| Top-N | 單注 ROI | 膽拖 ROI |');
console.log('|---|---|---|');
for (const N of [0, 1, 3, 5]) {
  const sortedSingle = rowsByTier.A_all.single.slice().sort((a, b) => b.payout - a.payout);
  const trimmedSingle = sortedSingle.slice(N);
  const sortedBanker = rowsByTier.A_all.banker.slice().sort((a, b) => b.payout - a.payout);
  const trimmedBanker = sortedBanker.slice(N);
  const sS = summarize('S', trimmedSingle);
  const sB = summarize('B', trimmedBanker);
  console.log(`| ${N} | ${sS.roi >= 0 ? '+' : ''}${sS.roi.toFixed(1)}% | ${sB.roi >= 0 ? '+' : ''}${sB.roi.toFixed(1)}% |`);
}

// Save out
const out = {};
for (const sec of sections) {
  out[sec.key] = {};
  for (const bet of ['single', 'banker']) {
    const rows = rowsByTier[sec.key][bet];
    out[sec.key][bet] = {
      summary: summarize('', rows),
      yearly: yearBreak(rows),
      monthly: monthBreak(rows),
      drawdown: maxDrawdown(rows),
      payouts: payoutStats(rows),
    };
  }
}
fs.writeFileSync(path.join(ROOT, 'data/v17-roi-summary.json'), JSON.stringify(out, null, 2), 'utf8');
console.log();
console.log('Wrote data/v17-roi-summary.json');
