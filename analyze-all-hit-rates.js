// analyze-all-hit-rates.js
// 全部模型命中率對比（修正 leakage 後）
//
// 命中率定義：
//   單注命中率：t12 揀嘅 2 匹是否實際 top 2（連贏中）
//   膽拖命中率：banker 任何一注命中（連贏膽拖中）
//   位Q單注命中率：t12 兩匹都喺 top3
//   位Q膽拖命中率：banker 任一組合兩匹都喺 top3
//   Top1 命中率：v17/v18 嘅 top1 揀馬命中冠軍 / 入頭 3
//   Top1-2 命中率：top 2 揀馬都喺實際 top3

const fs = require('fs');
const path = require('path');

const ROOT = 'd:/AI/Bet';

function loadDiv(d) {
  const f = path.join(ROOT, 'data/dividends/' + d.slice(0,4) + '/dividends-' + d + '.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f,'utf8')) : null;
}

function findPay(div, raceNo, pair, type) {
  if (!div) return 0;
  const r = div.races.find(x => x.raceNo === raceNo);
  if (!r) return 0;
  const list = r.dividends?.[type] || [];
  const k = pair.slice().sort().join(',');
  for (const d of list) if (d.combo.split(',').sort().join(',') === k) return d.amount;
  return 0;
}

function statsCalc(rows) {
  const stake = rows.reduce((s, r) => s + r.stake, 0);
  const payout = rows.reduce((s, r) => s + r.payout, 0);
  const pnl = payout - stake;
  return {
    plays: rows.length,
    stake,
    payout,
    pnl,
    roi: stake ? pnl / stake * 100 : 0,
  };
}

function evaluate(modelDir, getRec, modelLabel) {
  // For each race, derive: t12, banker, top1 horse no, top2 horse no, top3 actual
  const t12HitsRows = [], bankerHitsRows = [], pqSingleRows = [], pqBankerRows = [];
  const top1WinRows = [], top1Top3Rows = [], top12InTop3Rows = [];
  const top1Top2Match = [];

  for (const yr of ['2024', '2025', '2026']) {
    const dir = path.join(ROOT, 'data/backtest/' + modelDir + '/' + yr);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/(\d{4}-\d{2}-\d{2})/);
      if (!m) continue;
      const date = m[1];
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const div = loadDiv(date);

      for (const race of data.races) {
        if (!race.actualTop3 || race.actualTop3.length < 3) continue;
        const rec = getRec(race);
        if (!rec) continue;
        const t12 = rec.t12;
        const banker = rec.banker || [t12];
        const top2Actual = race.actualTop3.slice(0, 2);
        const top3Actual = race.actualTop3;

        // 連贏 single (t12)
        const sHit = top2Actual.includes(t12[0]) && top2Actual.includes(t12[1]);
        const qPaySingle = sHit ? findPay(div, race.raceNo, top2Actual, '連贏') * 10 : 0;
        t12HitsRows.push({ date, stake: 100, payout: qPaySingle, hit: sHit });

        // 連贏 banker (any of banker hits top 2)
        const bHit = banker.some(p => top2Actual.includes(p[0]) && top2Actual.includes(p[1]));
        const qPayB = bHit ? findPay(div, race.raceNo, top2Actual, '連贏') * 10 : 0;
        bankerHitsRows.push({ date, stake: 100 * banker.length, payout: qPayB, hit: bHit });

        // 位Q single
        const pqSHit = top3Actual.includes(t12[0]) && top3Actual.includes(t12[1]);
        const pqSPay = pqSHit ? findPay(div, race.raceNo, t12, '位置Q') * 10 : 0;
        pqSingleRows.push({ date, stake: 100, payout: pqSPay, hit: pqSHit });

        // 位Q banker (any banker pair both in top3)
        let pqBPay = 0;
        let pqBHit = false;
        for (const p of banker) {
          if (top3Actual.includes(p[0]) && top3Actual.includes(p[1])) {
            pqBPay += findPay(div, race.raceNo, p, '位置Q') * 10;
            pqBHit = true;
          }
        }
        pqBankerRows.push({ date, stake: 100 * banker.length, payout: pqBPay, hit: pqBHit });

        // Top1 命中冠軍
        top1WinRows.push({ date, stake: 0, payout: 0, hit: t12[0] === top3Actual[0] });
        // Top1 入 top3
        top1Top3Rows.push({ date, stake: 0, payout: 0, hit: top3Actual.includes(t12[0]) });
        // Top1 同 Top2 都喺 top3
        const top1Top2Both = top3Actual.includes(t12[0]) && top3Actual.includes(t12[1]);
        top12InTop3Rows.push({ date, stake: 0, payout: 0, hit: top1Top2Both });
      }
    }
  }

  function hr(rows) { return rows.length ? rows.filter(r => r.hit).length / rows.length * 100 : 0; }

  return {
    label: modelLabel,
    plays: t12HitsRows.length,
    qinSingle: { hr: hr(t12HitsRows), ...statsCalc(t12HitsRows) },
    qinBanker: { hr: hr(bankerHitsRows), ...statsCalc(bankerHitsRows) },
    pqSingle: { hr: hr(pqSingleRows), ...statsCalc(pqSingleRows) },
    pqBanker: { hr: hr(pqBankerRows), ...statsCalc(pqBankerRows) },
    top1Win: hr(top1WinRows),
    top1InTop3: hr(top1Top3Rows),
    top12BothInTop3: hr(top12InTop3Rows),
  };
}

// === 各模型 getRec ===
function v12Rec(race) {
  if (!race.recommend?.qinT12) return null;
  return {
    t12: race.recommend.qinT12.combo.split(','),
    banker: race.recommend.qinBanker?.map(b => b.combo.split(',')) || [],
  };
}
function v14Rec(race) {
  if (!race.recommend?.bets) return null;
  const t12 = race.recommend.qinT12.combo.split(',');
  const banker = race.recommend.bets.flatMap(b => [[b.t1, b.t2], [b.t1, b.t3]].filter(p => p[1]));
  return { t12, banker };
}
function v18Rec(race) {
  if (!race.v18?.tier) return null;
  return v14Rec(race);
}
function v9Rec(race) {
  if (race.recommendations?.action !== 'play') return null;
  const horses = race.recommendations.bets?.[0]?.horses;
  if (!horses || horses.length < 2) return null;
  const t1 = String(horses[0]), t2 = String(horses[1]);
  const t3 = race.v9Top4 ? String(race.v9Top4[2]) : null;
  return { t12: [t1, t2], banker: t3 ? [[t1, t2], [t1, t3]] : [[t1, t2]] };
}
function proRec(race) {
  if (!race.proTop4 || race.proTop4.length < 3) return null;
  const t1 = String(race.proTop4[0]), t2 = String(race.proTop4[1]), t3 = String(race.proTop4[2]);
  return { t12: [t1, t2], banker: [[t1, t2], [t1, t3]] };
}
function proGatedRec(race, v9Race) {
  if (v9Race?.recommendations?.action !== 'play') return null;
  return proRec(race);
}
// V15 / V17：用 race.recommend.qinT12 / qinBanker
function v15Rec(race) {
  if (!race.recommend?.qinT12) return null;
  return {
    t12: race.recommend.qinT12.combo.split(','),
    banker: race.recommend.qinBanker?.map(b => b.combo.split(',')) || [],
  };
}

// Pro+gate 要 cross-ref V9 backtest
function proGatedEvaluate() {
  const allDates = [];
  for (const yr of ['2024','2025','2026']) {
    const dir = path.join(ROOT, 'data/backtest/pro/' + yr);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/(\d{4}-\d{2}-\d{2})/);
      if (m) allDates.push(m[1]);
    }
  }
  allDates.sort();

  const t12HitsRows = [], bankerHitsRows = [], pqSingleRows = [], pqBankerRows = [];
  const top1WinRows = [], top1Top3Rows = [], top12InTop3Rows = [];

  for (const date of allDates) {
    const proFp = path.join(ROOT, 'data/backtest/pro/' + date.slice(0,4) + '/backtest-' + date + '.json');
    const v9Fp = path.join(ROOT, 'data/backtest/v9/' + date.slice(0,4) + '/backtest-v9-' + date + '.json');
    if (!fs.existsSync(proFp) || !fs.existsSync(v9Fp)) continue;
    const proD = JSON.parse(fs.readFileSync(proFp, 'utf8'));
    const v9D = JSON.parse(fs.readFileSync(v9Fp, 'utf8'));
    const v9Map = new Map();
    for (const r of v9D.races) v9Map.set(r.raceNo, r);
    const div = loadDiv(date);

    for (const race of proD.races) {
      if (!race.actualTop3 || race.actualTop3.length < 3) continue;
      const v9R = v9Map.get(race.raceNo);
      if (v9R?.recommendations?.action !== 'play') continue;
      const rec = proRec(race);
      if (!rec) continue;
      const t12 = rec.t12, banker = rec.banker;
      const top2 = race.actualTop3.slice(0,2);
      const top3 = race.actualTop3;

      const sHit = top2.includes(t12[0]) && top2.includes(t12[1]);
      const sPay = sHit ? findPay(div, race.raceNo, top2, '連贏') * 10 : 0;
      t12HitsRows.push({ date, stake: 100, payout: sPay, hit: sHit });

      const bHit = banker.some(p => top2.includes(p[0]) && top2.includes(p[1]));
      const bPay = bHit ? findPay(div, race.raceNo, top2, '連贏') * 10 : 0;
      bankerHitsRows.push({ date, stake: 100 * banker.length, payout: bPay, hit: bHit });

      const pqSH = top3.includes(t12[0]) && top3.includes(t12[1]);
      const pqSP = pqSH ? findPay(div, race.raceNo, t12, '位置Q') * 10 : 0;
      pqSingleRows.push({ date, stake: 100, payout: pqSP, hit: pqSH });

      let pqBP = 0; let pqBH = false;
      for (const p of banker) {
        if (top3.includes(p[0]) && top3.includes(p[1])) {
          pqBP += findPay(div, race.raceNo, p, '位置Q') * 10;
          pqBH = true;
        }
      }
      pqBankerRows.push({ date, stake: 100 * banker.length, payout: pqBP, hit: pqBH });

      top1WinRows.push({ date, hit: t12[0] === top3[0] });
      top1Top3Rows.push({ date, hit: top3.includes(t12[0]) });
      top12InTop3Rows.push({ date, hit: top3.includes(t12[0]) && top3.includes(t12[1]) });
    }
  }
  function hr(rows) { return rows.length ? rows.filter(r => r.hit).length / rows.length * 100 : 0; }

  return {
    label: 'Pro+V9 gate',
    plays: t12HitsRows.length,
    qinSingle: { hr: hr(t12HitsRows), ...statsCalc(t12HitsRows) },
    qinBanker: { hr: hr(bankerHitsRows), ...statsCalc(bankerHitsRows) },
    pqSingle: { hr: hr(pqSingleRows), ...statsCalc(pqSingleRows) },
    pqBanker: { hr: hr(pqBankerRows), ...statsCalc(pqBankerRows) },
    top1Win: hr(top1WinRows),
    top1InTop3: hr(top1Top3Rows),
    top12BothInTop3: hr(top12InTop3Rows),
  };
}

// === Run ===
const models = [
  evaluate('pro', proRec, 'Pro 無 gate'),
  proGatedEvaluate(),
  evaluate('v9', v9Rec, 'V9 raw'),
  evaluate('v10', v12Rec, 'V10'),
  evaluate('v11', v12Rec, 'V11'),
  evaluate('v12', v12Rec, 'V12'),
  evaluate('v14', v14Rec, 'V14'),
  evaluate('v15', v15Rec, 'V15.1 (修正)'),
  evaluate('v17', v15Rec, 'V17 (修正)'),
  evaluate('v18', v18Rec, 'V18 (V14+jt)'),
];

console.log('# 全部模型命中率分析（修正 leakage 後）');
console.log();
console.log('## 連贏 / 位置Q 命中率');
console.log('| 模型 | 場 | 連贏單注 | 連贏膽拖 | 位Q單注 | 位Q膽拖 |');
console.log('|---|---:|---:|---:|---:|---:|');
for (const m of models) {
  console.log(`| ${m.label} | ${m.plays} | ${m.qinSingle.hr.toFixed(1)}% | ${m.qinBanker.hr.toFixed(1)}% | ${m.pqSingle.hr.toFixed(1)}% | ${m.pqBanker.hr.toFixed(1)}% |`);
}

console.log();
console.log('## Top 揀馬 命中率');
console.log('| 模型 | 場 | Top1 中冠軍 | Top1 入 Top3 | Top1+Top2 都入 Top3 |');
console.log('|---|---:|---:|---:|---:|');
for (const m of models) {
  console.log(`| ${m.label} | ${m.plays} | ${m.top1Win.toFixed(1)}% | ${m.top1InTop3.toFixed(1)}% | ${m.top12BothInTop3.toFixed(1)}% |`);
}

console.log();
console.log('## ROI 對照');
console.log('| 模型 | 場 | 連贏單注 ROI | 連贏膽拖 ROI | 位Q膽拖 ROI |');
console.log('|---|---:|---:|---:|---:|');
for (const m of models) {
  console.log(`| ${m.label} | ${m.plays} | ${m.qinSingle.roi >= 0 ? '+' : ''}${m.qinSingle.roi.toFixed(1)}% | ${m.qinBanker.roi >= 0 ? '+' : ''}${m.qinBanker.roi.toFixed(1)}% | ${m.pqBanker.roi >= 0 ? '+' : ''}${m.pqBanker.roi.toFixed(1)}% |`);
}

// 隨機 baseline：實際冠亞 hit rate 假設場 12 匹隨機揀 2 = 1/(C(12,2)) = 1/66 = 1.5%；揀冠軍 = 1/12 = 8.3%
console.log();
console.log('## 隨機 baseline（12 匹陣容）');
console.log('| 玩法 | 隨機命中率 |');
console.log('|---|---:|');
console.log('| Top1 中冠軍 | ~8.3% |');
console.log('| Top1 入 Top3 | ~25.0% |');
console.log('| 連贏 (任何 2 匹) | ~1.5% |');
console.log('| 位置Q (任何 2 匹都入 top3) | ~4.5% |');

fs.writeFileSync(path.join(ROOT, 'data/all-models-hit-rates.json'), JSON.stringify(models, null, 2), 'utf8');
console.log();
console.log('Wrote data/all-models-hit-rates.json');
