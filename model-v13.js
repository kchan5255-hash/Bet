// model-v13.js
// V13 = 「Pro=V9 Top1 共識」+ V9 Top1 prob ≥ 18% + days since last 7-35
//
// 設計理念：
//   不再靠 V9 internal gate（喺 2024-2025 反向）
//   改用「Pro 同 V9 兩個獨立模型嘅 Top1 一致」做 ensemble signal
//   再加 V9 Top1 prob ≥ 18% 做 confidence threshold（市場上 sharp 嘅熱門）
//   再加 days 7-35 過濾（避免 too rusty / too fresh）
//
// 樣本表現（2024-01-07 至 2026-05-17，1934 場）：
//   • V13 連贏膽拖  : 758 場 / +$36,250 / ROI +23.9%
//   • 三年分拆：2024 +32% / 2025 +39% / 2026 -14%
//
// 對 V12 嘅補完：V12 喺 2024-2025 大蝕，V13 喺 2024-2025 大賺。
//
// 用法：
//   node model-v13.js
//   node model-v13.js 2026-05-17

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const POLICY = {
  consensus: true,         // Pro Top1 = V9 Top1
  v9T1ProbMin: 18,         // V9 Top1 prob ≥ 18%
  daysMin: 7,              // 上次出賽距今 ≥ 7 日
  daysMax: 35,             // 上次出賽距今 ≤ 35 日
};

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function v9OfRunner(v9Race, no) {
  return (v9Race.v9Ranking || []).find((x) => String(x.no) === String(no));
}

function classify(proRanking, v9Race) {
  if (!proRanking || proRanking.length < 3) return null;
  if (!v9Race?.v9Ranking || v9Race.v9Ranking.length < 3) return null;

  const pT1 = proRanking[0];
  const vT1 = v9Race.v9Ranking[0];

  if (String(pT1.no) !== String(vT1.no)) return null;
  if ((vT1.prob || 0) < POLICY.v9T1ProbMin) return null;

  const t1V9 = v9OfRunner(v9Race, pT1.no);
  if (!t1V9) return null;
  const days = t1V9.daysSinceLastRun;
  if (days != null && (days < POLICY.daysMin || days > POLICY.daysMax)) return null;

  return {
    t1: String(pT1.no),
    t2: String(proRanking[1].no),
    t3: String(proRanking[2].no),
    metrics: {
      proT1Prob: pT1.prob || 0,
      v9T1Prob: vT1.prob || 0,
      reliability: t1V9.reliability ?? 0,
      records: t1V9.records || 0,
      daysSinceLastRun: days ?? null,
      suitability: t1V9.groups?.suitability ?? 0,
      raceShape: t1V9.groups?.raceShape ?? 0,
    },
  };
}

function buildRaceEntry(proRace, v9Race) {
  const proRk = proRace.proRanking || [];
  const sel = classify(proRk, v9Race);
  let action = 'skip';
  const reasons = [];
  const riskFlags = [];

  if (sel) {
    action = 'play';
    reasons.push(
      'consensus-pro-v9-t1',
      `v9-t1-prob=${sel.metrics.v9T1Prob.toFixed(1)}%`,
      `days=${sel.metrics.daysSinceLastRun ?? 'n/a'}`,
    );
  } else if (proRk.length >= 3 && v9Race?.v9Ranking?.length >= 3) {
    if (String(proRk[0].no) !== String(v9Race.v9Ranking[0].no)) riskFlags.push('no-consensus');
    if ((v9Race.v9Ranking[0]?.prob || 0) < POLICY.v9T1ProbMin) riskFlags.push(`v9-t1-prob<${POLICY.v9T1ProbMin}%`);
    const days = v9OfRunner(v9Race, proRk[0].no)?.daysSinceLastRun;
    if (days != null && (days < POLICY.daysMin || days > POLICY.daysMax))
      riskFlags.push(`days-out-of-range:${days}`);
  } else {
    riskFlags.push('insufficient-data');
  }

  return {
    raceNo: proRace.raceNo,
    meta: proRace.meta || {},
    fieldSize: v9Race?.fieldSize ?? null,
    proTop3: proRk.slice(0, 3).map((r) => ({
      no: String(r.no),
      name: r.name || '',
      prob: Number(r.prob) || 0,
    })),
    recommendations: { action, reasons, riskFlags },
    recommend: sel
      ? {
          tier: 'banker',
          qinT12: { combo: `${sel.t1},${sel.t2}`, label: `${sel.t1}-${sel.t2}` },
          qinBanker: [
            { combo: `${sel.t1},${sel.t2}`, label: `${sel.t1}-${sel.t2}` },
            { combo: `${sel.t1},${sel.t3}`, label: `${sel.t1}-${sel.t3}` },
          ],
          metrics: sel.metrics,
        }
      : null,
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
    model: 'v13-consensus-prob-days',
    policy: POLICY,
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
  let totalPlays = 0, totalRaces = 0;
  for (const date of dates) {
    const out = processDate(date);
    if (!out) continue;
    const playCount = out.races.filter((r) => r.recommendations.action === 'play').length;
    totalPlays += playCount;
    totalRaces += out.races.length;
    fs.writeFileSync(paths.backtestWritePath('v13', date), JSON.stringify(out, null, 2), 'utf8');
  }
  console.log(`V13: ${dates.length} 日 / ${totalRaces} 場 / ${totalPlays} 場 play`);
}

if (require.main === module) main();
module.exports = { classify, buildRaceEntry, processDate, POLICY };
