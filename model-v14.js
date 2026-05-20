// model-v14.js
// V14 = V12 + V13 嘅 ensemble，每邊半倉
//
// 設計理念：
//   V12 對 2026 (V9 gate 正常) 強勁，但 2024-2025 慘蝕
//   V13 對 2024-2025 (V9 gate 反向) 強勁，但 2026 細蝕
//   V14 = 兩個各 50% 注額，三年都正回報
//
// 樣本表現（2024-01-07 至 2026-05-17）：
//   • V14 連贏膽拖：$87,400 流轉 / +$22,348 / ROI +25.6%
//   • 三年分拆：2024 +32% / 2025 +25% / 2026 +15% — 三年皆正
//
// 對 V12 / V13 嘅優勢：regime-agnostic
//
// 用法：
//   node model-v14.js
//   node model-v14.js 2026-05-17

const fs = require('fs');
const path = require('path');
const paths = require('./paths');
const v12 = require('./model-v12');
const v13 = require('./model-v13');

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function buildRaceEntry(proRace, v9Race) {
  const v12Race = v12.buildRaceEntry(proRace, v9Race);
  const v13Race = v13.buildRaceEntry(proRace, v9Race);
  const proRk = proRace.proRanking || [];

  const v12Rec = v12Race.recommend;
  const v13Rec = v13Race.recommend;

  // Hybrid bets
  const bets = [];
  const reasons = [];
  const tiers = [];

  if (v12Rec) {
    const v12T1 = v12Rec.qinT12.combo.split(',')[0];
    const v12T2 = v12Rec.qinT12.combo.split(',')[1];
    const v12T3 = v12Rec.qinBanker[1].combo.split(',')[1];
    bets.push({ source: 'v12', tier: v12Rec.tier, t1: v12T1, t2: v12T2, t3: v12T3, stakeMultiplier: 0.5 });
    tiers.push(`v12-${v12Rec.tier}`);
    reasons.push('v12-' + v12Rec.tier);
  }
  if (v13Rec) {
    const v13T1 = v13Rec.qinT12.combo.split(',')[0];
    const v13T2 = v13Rec.qinT12.combo.split(',')[1];
    const v13T3 = v13Rec.qinBanker[1].combo.split(',')[1];
    // 如果 V12 + V13 推同一隻 → 唔重覆落注
    const sameAsV12 = v12Rec && v13T1 === v12Rec.qinT12.combo.split(',')[0]
                              && v13T2 === v12Rec.qinT12.combo.split(',')[1];
    if (!sameAsV12) {
      bets.push({ source: 'v13', tier: 'banker', t1: v13T1, t2: v13T2, t3: v13T3, stakeMultiplier: 0.5 });
      tiers.push('v13');
      reasons.push('v13');
    } else {
      // 重疊：V12 嗰邊 promote 到 full stake
      const lastBet = bets[bets.length-1];
      if (lastBet) lastBet.stakeMultiplier = 1.0;
      reasons.push('v12-v13-overlap');
    }
  }

  const action = bets.length > 0 ? 'play' : 'skip';

  return {
    raceNo: proRace.raceNo,
    meta: proRace.meta || {},
    fieldSize: v9Race?.fieldSize ?? null,
    proTop3: proRk.slice(0, 3).map((r) => ({
      no: String(r.no),
      name: r.name || '',
      prob: Number(r.prob) || 0,
    })),
    recommendations: {
      action,
      tiers,
      reasons,
      v12RiskFlags: v12Race.recommendations?.riskFlags || [],
      v13RiskFlags: v13Race.recommendations?.riskFlags || [],
    },
    recommend: bets.length > 0 ? { bets, qinT12: bets[0] && { combo: `${bets[0].t1},${bets[0].t2}`, label: `${bets[0].t1}-${bets[0].t2}` } } : null,
    actualTop3: proRace.actualTop3 || [],
  };
}

function processDate(date) {
  const proPath = paths.backtestPath('pro', date);
  const v9Path = paths.backtestPath('v9', date);
  if (!fs.existsSync(proPath) || !fs.existsSync(v9Path)) return null;
  const proData = readJSON(proPath);
  const v9Data = readJSON(v9Path);
  const v9MapForDate = new Map();
  for (const r of (v9Data.races || [])) v9MapForDate.set(r.raceNo, r);
  const races = (proData.races || [])
    .filter((r) => r.proRanking && r.proRanking.length > 0)
    .map((r) => buildRaceEntry(r, v9MapForDate.get(r.raceNo)));
  return {
    date,
    venue: proData.venue || '',
    model: 'v14-v12-v13-hybrid',
    policy: { v12: v12.TIER_S, v13: v13.POLICY, ensembleStakeSplit: '50/50' },
    races,
  };
}

function main() {
  const args = process.argv.slice(2);
  const dates = [];
  if (args.length) dates.push(...args);
  else {
    for (const yr of ['2024','2025','2026']) {
      const dir = path.join(paths.DIRS.backtest, 'pro', yr);
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        const m = f.match(/(\d{4}-\d{2}-\d{2})/);
        if (m) dates.push(m[1]);
      }
    }
    dates.sort();
  }
  let totalPlays = 0, totalRaces = 0, totalBets = 0;
  for (const date of dates) {
    const out = processDate(date);
    if (!out) continue;
    const playCount = out.races.filter((r) => r.recommendations.action === 'play').length;
    const betCount = out.races.reduce((acc, r) => acc + (r.recommend?.bets?.length || 0), 0);
    totalPlays += playCount;
    totalRaces += out.races.length;
    totalBets += betCount;
    fs.writeFileSync(paths.backtestWritePath('v14', date), JSON.stringify(out, null, 2), 'utf8');
  }
  console.log(`V14: ${dates.length} 日 / ${totalRaces} 場 / ${totalPlays} 場 play / ${totalBets} 注 (50% stake each)`);
}

if (require.main === module) main();
module.exports = { buildRaceEntry, processDate };
