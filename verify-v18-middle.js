// verify-v18-middle.js
// V18 Middle distance robustness 全面驗證

const fs = require('fs');
const path = require('path');

const ROOT = 'd:/AI/Bet';
const STAKE = 100;

const sweep = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/v18-sweep.json'), 'utf8'));
const allPicks = sweep.picks;
const middlePicks = allPicks.filter(p => p.v18Score >= 1 && p.bucket === 'middle');

console.log(`Middle subset: ${middlePicks.length} picks`);
console.log();

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
    }
  }
  const pnl = payout - stake;
  return { plays: rows.length, hits, hr: rows.length?hits/rows.length*100:0, stake, pnl, roi: stake?pnl/stake*100:0 };
}

// ===== TEST 1: Sensitivity — 剔走 Top N 派彩 =====
console.log('## Test 1: Sensitivity（剔走 Top-N 派彩日）— 連贏膽拖');
console.log('| 剔 N | 場 | 中 | ROI |');
console.log('|---|---|---|---|');
for (const N of [0, 1, 3, 5, 10, 15, 20]) {
  const sorted = middlePicks.slice().sort((a, b) => {
    const aP = a.bHit ? a.qPay * a.stakeMul / 10 : 0;
    const bP = b.bHit ? b.qPay * b.stakeMul / 10 : 0;
    return bP - aP;
  });
  const trimmed = sorted.slice(N);
  const t = tally(trimmed, 'banker');
  console.log(`| ${N} | ${t.plays} | ${t.hits} | ${t.roi>=0?'+':''}${t.roi.toFixed(1)}% |`);
}

// ===== TEST 2: Random N% sampling x 100 trials =====
console.log('\n## Test 2: Random sub-sampling (50% 嘅 picks，跑 100 次)');
function rand50(rows) {
  const subset = rows.filter(() => Math.random() < 0.5);
  return tally(subset, 'banker').roi;
}
const trials = [];
for (let i = 0; i < 100; i++) trials.push(rand50(middlePicks));
trials.sort((a, b) => a - b);
console.log(`50% subsample ROI distribution (100 trials):`);
console.log(`  min: ${trials[0].toFixed(1)}%`);
console.log(`  5%: ${trials[5].toFixed(1)}%`);
console.log(`  25%: ${trials[25].toFixed(1)}%`);
console.log(`  median: ${trials[50].toFixed(1)}%`);
console.log(`  75%: ${trials[75].toFixed(1)}%`);
console.log(`  95%: ${trials[95].toFixed(1)}%`);
console.log(`  max: ${trials[99].toFixed(1)}%`);
console.log(`  >0% trials: ${trials.filter(t => t > 0).length}/100`);

// ===== TEST 3: Walk-forward — 半段 train 半段 test =====
console.log('\n## Test 3: Walk-forward (前半 vs 後半)');
const sorted = middlePicks.slice().sort((a, b) => a.date.localeCompare(b.date));
const half = Math.floor(sorted.length / 2);
const firstHalf = sorted.slice(0, half);
const secondHalf = sorted.slice(half);
const fhFirst = firstHalf[0]?.date, fhLast = firstHalf[half - 1]?.date;
const shFirst = secondHalf[0]?.date, shLast = secondHalf[secondHalf.length - 1]?.date;
console.log(`前半 ${fhFirst} ~ ${fhLast} (${firstHalf.length} 場):`);
const t1 = tally(firstHalf, 'banker');
console.log(`  ROI ${t1.roi.toFixed(1)}% / 中率 ${t1.hr.toFixed(1)}%`);
console.log(`後半 ${shFirst} ~ ${shLast} (${secondHalf.length} 場):`);
const t2 = tally(secondHalf, 'banker');
console.log(`  ROI ${t2.roi.toFixed(1)}% / 中率 ${t2.hr.toFixed(1)}%`);

// ===== TEST 4: 季度（quarterly）穩定度 =====
console.log('\n## Test 4: 季度穩定度');
const byQuarter = {};
for (const p of middlePicks) {
  const yr = p.date.slice(0, 4);
  const month = parseInt(p.date.slice(5, 7), 10);
  const q = Math.ceil(month / 3);
  const key = `${yr}-Q${q}`;
  if (!byQuarter[key]) byQuarter[key] = [];
  byQuarter[key].push(p);
}
console.log('| 季度 | 場 | 中 | 中率 | ROI 膽拖 |');
console.log('|---|---|---|---|---|');
for (const k of Object.keys(byQuarter).sort()) {
  const t = tally(byQuarter[k], 'banker');
  console.log(`| ${k} | ${t.plays} | ${t.hits} | ${t.hr.toFixed(1)}% | ${t.roi>=0?'+':''}${t.roi.toFixed(1)}% |`);
}

// ===== TEST 5: 月度連贏率 ROI 分佈 =====
console.log('\n## Test 5: 月度 ROI 分佈');
const byMonth = {};
for (const p of middlePicks) {
  const ym = p.date.slice(0, 7);
  if (!byMonth[ym]) byMonth[ym] = [];
  byMonth[ym].push(p);
}
const monthROIs = [];
for (const ym of Object.keys(byMonth).sort()) {
  const t = tally(byMonth[ym], 'banker');
  monthROIs.push({ ym, ...t });
}
const positive = monthROIs.filter(m => m.roi > 0).length;
const negative = monthROIs.filter(m => m.roi < 0).length;
const zero = monthROIs.filter(m => m.roi === 0).length;
console.log(`月度數: ${monthROIs.length} / 正回報 ${positive} / 負回報 ${negative} / 平手 ${zero}`);
console.log(`月度勝率: ${(positive / monthROIs.length * 100).toFixed(1)}%`);
console.log();
console.log('| 月 | 場 | 中 | 中率 | ROI |');
console.log('|---|---|---|---|---|');
for (const m of monthROIs) {
  console.log(`| ${m.ym} | ${m.plays} | ${m.hits} | ${m.hr.toFixed(1)}% | ${m.roi>=0?'+':''}${m.roi.toFixed(1)}% |`);
}

// ===== TEST 6: 隨機 shuffle 對照（信號 vs 噪音）=====
console.log('\n## Test 6: 隨機亂揀 (對照組)');
// 我哋揀全部 V14 middle distance picks（即 V18 score < 1 都計），
// 然後隨機抽同樣數量 (119) 出嚟，對比 V18 篩選嘅 ROI
const allMiddleV14 = allPicks.filter(p => p.bucket === 'middle');  // 包括 score < 1 嘅
console.log(`Middle 總共 V14 picks: ${allMiddleV14.length}`);
const randomTrials = [];
for (let i = 0; i < 100; i++) {
  const shuffled = allMiddleV14.slice().sort(() => Math.random() - 0.5).slice(0, 119);
  randomTrials.push(tally(shuffled, 'banker').roi);
}
randomTrials.sort((a, b) => a - b);
console.log(`隨機 119 場 ROI 分佈 (100 trials):`);
console.log(`  median: ${randomTrials[50].toFixed(1)}%`);
console.log(`  95% range: ${randomTrials[2].toFixed(1)}% ~ ${randomTrials[97].toFixed(1)}%`);
const v18MiddleROI = tally(middlePicks, 'banker').roi;
console.log(`V18 篩選 ROI: ${v18MiddleROI.toFixed(1)}%`);
console.log(`V18 ROI 喺 random distribution percentile: ${randomTrials.filter(t => t < v18MiddleROI).length}%`);

// ===== TEST 7: 第二強組合 — sprint or staying 仲有冇 alpha? =====
console.log('\n## Test 7: 對照 — V18 score ≥ 1 + 其他距離');
console.log('| 距離 | 場 | 中 | 中率 | ROI |');
console.log('|---|---|---|---|---|');
for (const bucket of ['sprint', 'middle', 'staying']) {
  const sub = allPicks.filter(p => p.v18Score >= 1 && p.bucket === bucket);
  const t = tally(sub, 'banker');
  console.log(`| ${bucket} | ${t.plays} | ${t.hits} | ${t.hr.toFixed(1)}% | ${t.roi>=0?'+':''}${t.roi.toFixed(1)}% |`);
}

// ===== TEST 8: 派彩分佈 / 中獎質量 =====
console.log('\n## Test 8: 派彩分佈（中咗時嘅膽拖派彩）');
const winPays = middlePicks.filter(p => p.bHit).map(p => p.qPay * p.stakeMul / 10).sort((a, b) => a - b);
console.log(`中獎 ${winPays.length} 場`);
console.log(`  最低: \$${winPays[0].toFixed(0)}`);
console.log(`  Q1: \$${winPays[Math.floor(winPays.length * 0.25)].toFixed(0)}`);
console.log(`  中位: \$${winPays[Math.floor(winPays.length * 0.5)].toFixed(0)}`);
console.log(`  Q3: \$${winPays[Math.floor(winPays.length * 0.75)].toFixed(0)}`);
console.log(`  最高: \$${winPays[winPays.length - 1].toFixed(0)}`);
const sum = winPays.reduce((a, b) => a + b, 0);
console.log(`  平均: \$${(sum / winPays.length).toFixed(0)}`);

// ===== TEST 9: 連蝕段 vs 連中段 =====
console.log('\n## Test 9: 連續結果分佈');
let lossStreak = 0, winStreak = 0, maxLoss = 0, maxWin = 0;
const sortedByDate = middlePicks.slice().sort((a, b) => a.date.localeCompare(b.date));
for (const p of sortedByDate) {
  if (p.bHit) { winStreak++; if (winStreak > maxWin) maxWin = winStreak; lossStreak = 0; }
  else { lossStreak++; if (lossStreak > maxLoss) maxLoss = lossStreak; winStreak = 0; }
}
console.log(`最長連蝕 (race-level): ${maxLoss} 場`);
console.log(`最長連中: ${maxWin} 場`);

// 累積 PnL curve
console.log('\n## Test 10: 累積 PnL curve（連贏膽拖，每 20 場一個 checkpoint）');
let cum = 0, peak = 0, maxDD = 0;
console.log('| 序號 (累計場數) | 累計 PnL | Drawdown |');
console.log('|---|---|---|');
sortedByDate.forEach((p, i) => {
  const stake = STAKE * p.stakeMul * p.bankerCount;
  const payout = p.bHit ? p.qPay * STAKE * p.stakeMul / 10 : 0;
  cum += payout - stake;
  if (cum > peak) peak = cum;
  const dd = cum - peak;
  if (dd < maxDD) maxDD = dd;
  if ((i + 1) % 20 === 0 || i === sortedByDate.length - 1) {
    console.log(`| ${i + 1} | \$${Math.round(cum).toLocaleString()} | \$${Math.round(dd).toLocaleString()} |`);
  }
});
console.log(`Max drawdown: \$${Math.round(maxDD).toLocaleString()}`);
