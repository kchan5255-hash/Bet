// analyze-v17-pq.js
// 位置Q (Quinella Place) ROI for V17
//
// 位置Q：揀 2 匹馬，2 匹都喺實際 top3 = 中
// 派彩：每 race 最多 3 個 combo（top3 任何 2 匹組合）
//
// 玩法：
//   單注 $100/場 = 揀 top1 + top2 (1 combo)
//   膽拖 $200/場 = top1 + top2、top1 + top3 (2 combo)

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

function findPQPayout(divData, raceNo, pair) {
  if (!divData) return 0;
  const race = divData.races?.find(r => r.raceNo === raceNo);
  if (!race) return 0;
  const pq = race.dividends?.['位置Q'] || [];
  const sortedKey = pair.slice().sort((a, b) => Number(a) - Number(b)).join(',');
  for (const d of pq) {
    const k = d.combo.split(',').map(s => s.trim()).sort((a, b) => Number(a) - Number(b)).join(',');
    if (k === sortedKey) return d.amount;
  }
  return 0;
}

function evaluateRace(rec, race, divData) {
  const top3Actual = race.actualTop3.slice(0, 3);
  if (top3Actual.length < 3) return null;

  const t12 = rec.qinT12.combo.split(',');
  const banker = rec.qinBanker.map(b => b.combo.split(','));

  function isInTop3(no) { return top3Actual.includes(no); }
  function pairInTop3(pair) { return isInTop3(pair[0]) && isInTop3(pair[1]); }

  const singleHit = pairInTop3(t12);
  const bankerHits = banker.filter(pairInTop3);

  // 派彩 lookup（per pair）
  let singlePayout = 0;
  if (singleHit) {
    const p = findPQPayout(divData, race.raceNo, t12);
    singlePayout = p * STAKE / 10;
  }
  let bankerPayout = 0;
  for (const pair of bankerHits) {
    const p = findPQPayout(divData, race.raceNo, pair);
    bankerPayout += p * STAKE / 10;
  }

  return {
    singleStake: STAKE,
    singlePayout,
    bankerStake: STAKE * 2,
    bankerPayout,
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
  return { maxDD, bestDay, worstDay, maxLossStreak, maxWinStreak };
}

function yearBreak(rows) {
  const out = {};
  for (const r of rows) {
    const yr = r.date.slice(0, 4);
    if (!out[yr]) out[yr] = [];
    out[yr].push(r);
  }
  const result = {};
  for (const yr of Object.keys(out)) result[yr] = summarize(yr, out[yr]);
  return result;
}

// ===== main =====
const rowsByTier = {
  A_all: { single: [], banker: [] },
  B: { single: [], banker: [] },
  C: { single: [], banker: [] },
  A_only: { single: [], banker: [] },
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
    if (!race.recommend || !race.actualTop3 || race.actualTop3.length < 3) continue;
    const rec = race.recommend;
    const tier = race.recommendations?.tier;
    if (!tier) continue;

    const e = evaluateRace(rec, race, div);
    if (!e) continue;

    const sRow = { date, raceNo: race.raceNo, stake: e.singleStake, payout: e.singlePayout };
    const bRow = { date, raceNo: race.raceNo, stake: e.bankerStake, payout: e.bankerPayout };

    if (tier === 'A') { rowsByTier.A_only.single.push(sRow); rowsByTier.A_only.banker.push(bRow); }
    if (tier === 'B') { rowsByTier.B.single.push(sRow); rowsByTier.B.banker.push(bRow); }
    if (tier === 'C') { rowsByTier.C.single.push(sRow); rowsByTier.C.banker.push(bRow); }
    rowsByTier.A_all.single.push(sRow);
    rowsByTier.A_all.banker.push(bRow);
  }
}

console.log('===== V17 位置Q (Quinella Place) ROI =====');
console.log(`資料：${dates.length} 個賽馬日 / ${raceCount} 場 / 押注 $${STAKE}/注`);
console.log();

const sections = [
  { key: 'A_all', name: 'V17-A (全部 ratingDelta ≥ 2)' },
  { key: 'B', name: 'V17-B (only) (rating + lbw ≤ 2)' },
  { key: 'C', name: 'V17-C (only) (rating + avgLBW3 ≤ 3, 唔過 B)' },
];

console.log('## 位置Q Tier 總表');
console.log('| Tier (玩法) | 場數 | 流轉 | 中 | 中獎率 | 派彩 | 盈虧 | ROI |');
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
console.log('## 風險（V17-A 全部）');
for (const bet of ['single', 'banker']) {
  const dd = maxDrawdown(rowsByTier.A_all[bet]);
  const label = bet === 'single' ? '位置Q單注' : '位置Q膽拖';
  console.log(`- ${label}：最大回撤 $${dd.maxDD.toFixed(0)} / 最佳一日 +$${dd.bestDay.pnl.toFixed(0)} (${dd.bestDay.date}) / 最差一日 $${dd.worstDay.pnl.toFixed(0)} (${dd.worstDay.date}) / 連蝕 ${dd.maxLossStreak} 日`);
}

console.log();
console.log('## 派彩分布（中咗時）');
console.log('| Tier (玩法) | 中 | 最低 | 中位 | 平均 | 最高 |');
console.log('|---|---:|---:|---:|---:|---:|');
for (const sec of sections) {
  for (const bet of ['single', 'banker']) {
    const wins = rowsByTier[sec.key][bet].filter(r => r.payout > 0).map(r => r.payout);
    if (!wins.length) continue;
    wins.sort((a, b) => a - b);
    const med = wins[Math.floor(wins.length / 2)];
    const avg = wins.reduce((s, v) => s + v, 0) / wins.length;
    console.log(`| ${sec.name} (${bet === 'single' ? '單注' : '膽拖'}) | ${wins.length} | $${wins[0].toFixed(0)} | $${med.toFixed(0)} | $${avg.toFixed(0)} | $${wins[wins.length - 1].toFixed(0)} |`);
  }
}

// Sensitivity
console.log();
console.log('## V17-A 全部 sensitivity');
console.log('| 剔 Top-N | 單注 ROI | 膽拖 ROI |');
console.log('|---|---|---|');
for (const N of [0, 1, 3, 5]) {
  const sS = summarize('S', rowsByTier.A_all.single.slice().sort((a, b) => b.payout - a.payout).slice(N));
  const sB = summarize('B', rowsByTier.A_all.banker.slice().sort((a, b) => b.payout - a.payout).slice(N));
  console.log(`| ${N} | ${sS.roi >= 0 ? '+' : ''}${sS.roi.toFixed(1)}% | ${sB.roi >= 0 ? '+' : ''}${sB.roi.toFixed(1)}% |`);
}

// 對比：連贏 vs 位置Q（同一 sample）
console.log();
console.log('## 連贏 vs 位置Q（V17-A 全部）');
const qinSummary = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/v17-roi-summary.json'), 'utf8'));
const qS = qinSummary.A_all.single.summary;
const qB = qinSummary.A_all.banker.summary;
const pS = summarize('', rowsByTier.A_all.single);
const pB = summarize('', rowsByTier.A_all.banker);
console.log('| 玩法 | 場 | 中 | 中率 | ROI | 盈虧 |');
console.log('|---|---:|---:|---:|---:|---:|');
console.log(`| 連贏單注 | ${qS.plays} | ${qS.hits} | ${qS.hitRate.toFixed(1)}% | ${qS.roi >= 0 ? '+' : ''}${qS.roi.toFixed(1)}% | ${qS.pnl >= 0 ? '+' : ''}$${qS.pnl.toLocaleString()} |`);
console.log(`| 連贏膽拖 | ${qB.plays} | ${qB.hits} | ${qB.hitRate.toFixed(1)}% | ${qB.roi >= 0 ? '+' : ''}${qB.roi.toFixed(1)}% | ${qB.pnl >= 0 ? '+' : ''}$${qB.pnl.toLocaleString()} |`);
console.log(`| 位置Q單注 | ${pS.plays} | ${pS.hits} | ${pS.hitRate.toFixed(1)}% | ${pS.roi >= 0 ? '+' : ''}${pS.roi.toFixed(1)}% | ${pS.pnl >= 0 ? '+' : ''}$${pS.pnl.toLocaleString()} |`);
console.log(`| 位置Q膽拖 | ${pB.plays} | ${pB.hits} | ${pB.hitRate.toFixed(1)}% | ${pB.roi >= 0 ? '+' : ''}${pB.roi.toFixed(1)}% | ${pB.pnl >= 0 ? '+' : ''}$${pB.pnl.toLocaleString()} |`);

// Save
const out = {};
for (const sec of sections) {
  out[sec.key] = {};
  for (const bet of ['single', 'banker']) {
    const rows = rowsByTier[sec.key][bet];
    const wins = rows.filter(r => r.payout > 0).map(r => r.payout).sort((a, b) => a - b);
    out[sec.key][bet] = {
      summary: summarize('', rows),
      yearly: yearBreak(rows),
      drawdown: maxDrawdown(rows),
      payouts: wins.length ? { n: wins.length, min: wins[0], median: wins[Math.floor(wins.length / 2)], avg: wins.reduce((s, v) => s + v, 0) / wins.length, max: wins[wins.length - 1] } : null,
    };
  }
}
fs.writeFileSync(path.join(ROOT, 'data/v17-pq-summary.json'), JSON.stringify(out, null, 2), 'utf8');
console.log();
console.log('Wrote data/v17-pq-summary.json');
