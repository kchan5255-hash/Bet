// analyze-top4-in-top3.js
// 各模型「頭 4 揀馬中至少 3 隻入實際 top3」嘅機率
// + 仔細分拆：恰好 1 隻 / 恰好 2 隻 / 恰好 3 隻 / 恰好 4 隻（不可能）

const fs = require('fs');
const path = require('path');

const ROOT = 'd:/AI/Bet';

// 各模型 getTop4
function v9Top4(race) {
  return race.v9Top4 ? race.v9Top4.slice(0, 4).map(String) : null;
}
function proTop4(race) {
  return race.proTop4 ? race.proTop4.slice(0, 4).map(String) : null;
}
function v15Top4(race) {
  if (!race.v15Ranking) return null;
  return race.v15Ranking.slice(0, 4).map(r => String(r.no));
}
function v17Top4(race) {
  if (!race.v17Ranking) return null;
  return race.v17Ranking.slice(0, 4).map(r => String(r.no));
}
// V12/V11/V10 用 proTop4 (since V12 uses Pro)
function v12Top4(race) {
  if (race.proTop3) {
    const t12 = race.recommend?.qinT12?.combo.split(',') || [];
    if (t12.length >= 2) {
      // V12 推介嘅 top 2，加 proTop3 first 2 + 一個 backup
      // Simpler: try use race.proTop3 + recommend.qinBanker[1].combo[1]
      const t3 = race.recommend?.qinBanker?.[1]?.combo?.split(',')?.[1];
      const ids = [...t12];
      for (const r of race.proTop3) {
        if (!ids.includes(r.no)) ids.push(r.no);
        if (ids.length >= 4) break;
      }
      if (t3 && !ids.includes(t3)) ids.splice(2, 0, t3);
      return ids.slice(0, 4);
    }
  }
  return null;
}
function v14Top4(race, proRaceMap) {
  if (!race.recommend?.bets?.length) return null;
  const t12 = race.recommend.qinT12.combo.split(',');
  const ids = [];
  for (const x of t12) if (!ids.includes(x)) ids.push(x);
  for (const b of race.recommend.bets) {
    for (const x of [b.t1, b.t2, b.t3]) {
      if (x && !ids.includes(x)) ids.push(x);
    }
  }
  // Pad with proTop4 from cross-ref pro backtest
  const proRace = proRaceMap?.get(race.raceNo);
  const proTop4 = proRace?.proTop4 || [];
  for (const n of proTop4) {
    if (ids.length >= 4) break;
    if (!ids.includes(String(n))) ids.push(String(n));
  }
  return ids.length >= 4 ? ids.slice(0, 4) : null;
}
function v18Top4(race, proRaceMap) {
  if (!race.v18?.tier) return null;
  return v14Top4(race, proRaceMap);
}

function analyze(modelDir, getTop4, label, needsProMap) {
  let total = 0;
  let counts = [0, 0, 0, 0, 0];
  for (const yr of ['2024','2025','2026']) {
    const dir = path.join(ROOT, 'data/backtest/' + modelDir + '/' + yr);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/(\d{4}-\d{2}-\d{2})/);
      if (!m) continue;
      const date = m[1];
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      let proMap = null;
      if (needsProMap) {
        const proFp = path.join(ROOT, 'data/backtest/pro/' + yr + '/backtest-' + date + '.json');
        if (fs.existsSync(proFp)) {
          const proD = JSON.parse(fs.readFileSync(proFp, 'utf8'));
          proMap = new Map();
          for (const r of proD.races) proMap.set(r.raceNo, r);
        }
      }
      for (const race of data.races) {
        if (!race.actualTop3 || race.actualTop3.length < 3) continue;
        const top4 = getTop4(race, proMap);
        if (!top4 || top4.length < 4) continue;
        const top3Set = new Set(race.actualTop3.map(String));
        const hits = top4.filter(n => top3Set.has(String(n))).length;
        total++;
        counts[hits]++;
      }
    }
  }
  const out = { label, total };
  for (let i = 0; i <= 3; i++) {
    out[`exactly${i}`] = counts[i];
    out[`exactly${i}_pct`] = total ? counts[i] / total * 100 : 0;
  }
  out.atLeast2 = counts[2] + counts[3];
  out.atLeast2_pct = total ? out.atLeast2 / total * 100 : 0;
  out.atLeast3 = counts[3];
  out.atLeast3_pct = total ? out.atLeast3 / total * 100 : 0;
  return out;
}

const results = [
  analyze('pro', proTop4, 'Pro top4'),
  analyze('v9', v9Top4, 'V9 top4'),
  analyze('v15', v15Top4, 'V15.1 top4 (修正)'),
  analyze('v17', v17Top4, 'V17 top4 (修正)'),
  analyze('v14', v14Top4, 'V14 top4', true),
  analyze('v18', v18Top4, 'V18 top4', true),
];

console.log('# 頭 4 揀馬入實際 Top 3 嘅機率（修正 leakage 後）');
console.log();
console.log('## 命中分佈（每場 4 揀，實際 3 名額）');
console.log('| 模型 | 場 | 命中 0 | 命中 1 | 命中 2 | 命中 3 | ≥1 命中 | ≥2 命中 | ≥3 命中 |');
console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const r of results) {
  const atLeast1 = 100 - r.exactly0_pct;
  console.log(`| ${r.label} | ${r.total} | ${r.exactly0_pct.toFixed(1)}% | ${r.exactly1_pct.toFixed(1)}% | ${r.exactly2_pct.toFixed(1)}% | ${r.exactly3_pct.toFixed(1)}% | **${atLeast1.toFixed(1)}%** | **${r.atLeast2_pct.toFixed(1)}%** | **${r.atLeast3_pct.toFixed(1)}%** |`);
}

// 隨機 baseline：頭 4 揀馬入頭 3
// 假設 12 匹陣容，揀 4 隨機，問實際 top3 有 k 個係嗰 4 個入面
// hypergeometric: P(X = k) = C(3,k) * C(9,4-k) / C(12,4)
// k=0: C(3,0)*C(9,4)/C(12,4) = 1*126/495 = 0.255
// k=1: C(3,1)*C(9,3)/C(12,4) = 3*84/495 = 0.509
// k=2: C(3,2)*C(9,2)/C(12,4) = 3*36/495 = 0.218
// k=3: C(3,3)*C(9,1)/C(12,4) = 1*9/495 = 0.018
console.log();
console.log('## 隨機 baseline (假設 12 匹陣容，超幾何分布)');
console.log('| 命中數 | 機率 |');
console.log('|---|---:|');
console.log('| 0 | 25.5% |');
console.log('| 1 | 50.9% |');
console.log('| 2 | 21.8% |');
console.log('| 3 | 1.8% |');
console.log('| ≥2 | 23.6% |');
console.log('| ≥3 | 1.8% |');

// 隨機 baseline ≥1 = 1 - C(9,4)/C(12,4) = 1 - 0.255 = 74.5%
console.log();
console.log('## ≥1 命中嘅信心比（4 揀至少 1 匹入 top3）');
console.log('| 模型 | ≥1 命中 % | vs 隨機 74.5% | 倍數 |');
console.log('|---|---:|---:|---:|');
for (const r of results) {
  const atLeast1 = 100 - r.exactly0_pct;
  const mult = atLeast1 / 74.5;
  console.log(`| ${r.label} | ${atLeast1.toFixed(1)}% | +${(atLeast1 - 74.5).toFixed(1)} pp | ${mult.toFixed(2)}× |`);
}

console.log();
console.log('## ≥3 命中嘅信心比');
console.log('| 模型 | ≥3 命中 % | vs 隨機 1.8% | 倍數 |');
console.log('|---|---:|---:|---:|');
for (const r of results) {
  const mult = r.atLeast3_pct / 1.8;
  console.log(`| ${r.label} | ${r.atLeast3_pct.toFixed(1)}% | +${(r.atLeast3_pct - 1.8).toFixed(1)} pp | ${mult.toFixed(1)}× |`);
}
console.log('| 模型 | ≥3 命中 % | vs 隨機 1.8% | 倍數 |');
console.log('|---|---:|---:|---:|');
for (const r of results) {
  const mult = r.atLeast3_pct / 1.8;
  console.log(`| ${r.label} | ${r.atLeast3_pct.toFixed(1)}% | +${(r.atLeast3_pct - 1.8).toFixed(1)} pp | ${mult.toFixed(1)}× |`);
}

console.log();
console.log('## ≥2 命中嘅信心比');
console.log('| 模型 | ≥2 命中 % | vs 隨機 23.6% | 倍數 |');
console.log('|---|---:|---:|---:|');
for (const r of results) {
  const mult = r.atLeast2_pct / 23.6;
  console.log(`| ${r.label} | ${r.atLeast2_pct.toFixed(1)}% | +${(r.atLeast2_pct - 23.6).toFixed(1)} pp | ${mult.toFixed(2)}× |`);
}

fs.writeFileSync(path.join(ROOT, 'data/all-models-top4-in-top3.json'), JSON.stringify(results, null, 2));
console.log();
console.log('Wrote data/all-models-top4-in-top3.json');
