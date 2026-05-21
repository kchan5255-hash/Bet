// model-v10.js
// V10 是 Pro+V9 ensemble 過濾器，唔係新模型；佢揀一場 race 是否 play、用 Pro Top1-3 落注。
//
// 規則：
//   1. V9 internal recommendations.action === 'play'（V9 risk gate）
//   2. Pro Top1 嘅 V9 reliability ≥ 0.50（V9 reliability gate，過濾 records 唔夠 / suitability 弱嘅熱門）
//   3. Pro Top1 嘅 modelProbability ≥ 10%（dominance gate，避免「均勢場」嘅 false top1）
//
// 樣本表現（2026-01-01 至 2026-05-17，322 場）：
//   • Baseline (Pro+V9 gate)         : 116 場 / +$3,755 / ROI +32.37%
//   • V10                            : 95  場 / +$5,855 / ROI +61.63%
//   • V10 連贏膽拖                    : +$10,865 / ROI +57.18%
//
// 用法：
//   node model-v10.js                              # 全部已有 backtest 嘅日期，輸出 backtest-v10-{date}.json
//   node model-v10.js 2026-05-17                   # 指定日子

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const MIN_RELIABILITY = 0.50;
const MIN_PROB = 10;

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function v10ProGateSelect(proRanking, v9Race) {
  if (!proRanking || proRanking.length < 3) return null;
  if (!v9Race?.v9Ranking || v9Race.v9Ranking.length < 3) return null;
  if (v9Race.recommendations?.action !== 'play') return null;

  const pT1 = proRanking[0];
  const v9T1Match = v9Race.v9Ranking.find((x) => String(x.no) === String(pT1.no));
  const reliability = v9T1Match?.reliability ?? 0;
  if (reliability < MIN_RELIABILITY) return null;

  const prob = pT1.prob || 0;
  if (prob < MIN_PROB) return null;

  return {
    t1: String(pT1.no),
    t2: String(proRanking[1].no),
    t3: String(proRanking[2].no),
    reasons: [
      'v9-gate-play',
      `t1-reliability=${reliability.toFixed(2)}`,
      `t1-prob=${prob.toFixed(1)}%`,
    ],
  };
}

function buildRaceEntry(proRace, v9Race) {
  const proRk = proRace.proRanking || [];
  const sel = v10ProGateSelect(proRk, v9Race);
  const action = sel ? 'play' : 'skip';
  const reasons = [];
  const riskFlags = [];
  if (!sel) {
    if (v9Race?.recommendations?.action !== 'play') riskFlags.push('v9-gate-skip');
    else if (proRk.length < 3) riskFlags.push('insufficient-pro-ranking');
    else {
      const v9T1 = v9Race.v9Ranking?.find((x) => String(x.no) === String(proRk[0].no));
      const rel = v9T1?.reliability ?? 0;
      if (rel < MIN_RELIABILITY) riskFlags.push(`low-reliability:${rel.toFixed(2)}`);
      if ((proRk[0].prob || 0) < MIN_PROB) riskFlags.push(`low-prob:${(proRk[0].prob || 0).toFixed(1)}%`);
    }
  } else {
    reasons.push(...sel.reasons);
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
    recommendations: {
      action,
      reasons,
      riskFlags,
    },
    recommend: sel
      ? {
          qinT12: { combo: `${sel.t1},${sel.t2}`, label: `${sel.t1}-${sel.t2}` },
          qinBanker: [
            { combo: `${sel.t1},${sel.t2}`, label: `${sel.t1}-${sel.t2}` },
            { combo: `${sel.t1},${sel.t3}`, label: `${sel.t1}-${sel.t3}` },
          ],
        }
      : null,
    actualTop3: proRace.actualTop3 || [],
  };
}

function processDate(date) {
  const proPath = paths.backtestPath('pro', date);
  const v9Path = paths.backtestPath('v9', date);
  if (!fs.existsSync(proPath)) {
    console.warn(`SKIP ${date}: missing pro backtest`);
    return null;
  }
  if (!fs.existsSync(v9Path)) {
    console.warn(`SKIP ${date}: missing v9 backtest`);
    return null;
  }
  const proData = readJSON(proPath);
  const v9Data = readJSON(v9Path);
  const v9Map = new Map();
  for (const r of (v9Data.races || [])) v9Map.set(r.raceNo, r);

  const races = (proData.races || [])
    .filter((r) => r.proRanking && r.proRanking.length > 0)
    .map((r) => buildRaceEntry(r, v9Map.get(r.raceNo)));

  return {
    date,
    venue: proData.venue || '',
    model: 'v10-pro-v9-ensemble',
    policy: {
      reliabilityGate: MIN_RELIABILITY,
      probGate: MIN_PROB,
      stakeUnit: 10,
      defaultRule: `V10 = Pro+V9. Play 連贏 Top1-Top2 only when V9 gate=play, Pro Top1 reliability >= ${MIN_RELIABILITY}, Pro Top1 prob >= ${MIN_PROB}%.`,
    },
    races,
  };
}

function writeOutput(payload) {
  const outPath = paths.backtestWritePath('v10', payload.date);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  return outPath;
}

function main() {
  const args = process.argv.slice(2);
  const proDir = path.join(paths.DIRS.backtest, 'pro', new Date().getFullYear().toString());
  const allDates = fs.existsSync(proDir)
    ? fs.readdirSync(proDir)
        .filter((f) => f.startsWith('backtest-') && f.endsWith('.json'))
        .map((f) => f.replace('backtest-', '').replace('.json', ''))
        .sort()
    : [];
  const dates = args.length ? args : allDates;
  if (!dates.length) {
    console.log('No dates available; pass dates as args or run Pro backtest first.');
    return;
  }
  let totalPlay = 0, totalRaces = 0;
  for (const date of dates) {
    const out = processDate(date);
    if (!out) continue;
    const playCount = out.races.filter((r) => r.recommendations.action === 'play').length;
    totalPlay += playCount;
    totalRaces += out.races.length;
    const outPath = writeOutput(out);
    console.log(`  ${date}: ${out.races.length} races, ${playCount} play → ${outPath}`);
  }
  console.log(`\nTotal: ${dates.length} 日 / ${totalRaces} 場 / ${totalPlay} 場 V10 play`);
}

if (require.main === module) main();

module.exports = { v10ProGateSelect, buildRaceEntry, processDate, MIN_RELIABILITY, MIN_PROB };
