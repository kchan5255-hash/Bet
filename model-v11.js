// model-v11.js
// V11 = V10 + suitability/records/V9 prob/T2 reliability filters，分兩 tier：
//   - Tier S (Strong)：suit≥0.60 + rec≥10 + V9 T1 prob≥14% → 落連贏單注 (ROI +119.34%)
//   - Tier B (Banker)：suit≥0.60 + V9 T1 prob≥14% + T2 rel≥0.50 → 落連贏膽拖 (ROI +77.77%)
//   - Tier S ⊂ Tier B：strong 場必然係 banker 場
//
// 樣本（2026-01-01 至 2026-05-17，322 場）：
//   • V11 Tier S 連贏單注  : 61 場 / +$7,280 / ROI +119.34%
//   • V11 Tier B 連贏膽拖  : 84 場 / +$13,065 / ROI +77.77%
//
// 用法：
//   node model-v11.js               # 全部已有 backtest 嘅日期
//   node model-v11.js 2026-05-17     # 指定日子

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const TIER_S = {
  reliability: 0.50,
  prob: 10,
  suitability: 0.60,
  records: 10,
  v9T1Prob: 14,
};
const TIER_B = {
  reliability: 0.50,
  prob: 10,
  suitability: 0.60,
  v9T1Prob: 14,
  t2Reliability: 0.50,
};

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function v9OfRunner(v9Race, no) {
  return (v9Race.v9Ranking || []).find((x) => String(x.no) === String(no));
}

function v9T1Prob(v9Race) {
  return v9Race.v9Ranking?.[0]?.prob ?? 0;
}

function classifyTier(proRanking, v9Race) {
  if (!proRanking || proRanking.length < 3) return null;
  if (!v9Race?.v9Ranking || v9Race.v9Ranking.length < 3) return null;
  if (v9Race.recommendations?.action !== 'play') return null;

  const pT1 = proRanking[0];
  const pT1V9 = v9OfRunner(v9Race, pT1.no);
  if (!pT1V9) return null;

  const reliability = pT1V9.reliability ?? 0;
  const prob = pT1.prob || 0;
  const suitability = pT1V9.groups?.suitability ?? 0;
  const records = pT1V9.records || 0;
  const v9p = v9T1Prob(v9Race);

  // V10 base check
  if (reliability < 0.50) return null;
  if (prob < 10) return null;
  // suitability + V9 T1 prob 係 Tier B 共通條件
  if (suitability < TIER_B.suitability) return null;
  if (v9p < TIER_B.v9T1Prob) return null;

  // Tier B 額外條件：T2 reliability
  const pT2 = proRanking[1];
  const t2Rel = v9OfRunner(v9Race, pT2.no)?.reliability ?? 0;
  if (t2Rel < TIER_B.t2Reliability) return null;

  // 至此符合 Tier B
  // 再睇係咪符合 Tier S：records ≥ 10
  const tier = records >= TIER_S.records ? 'strong' : 'banker';
  return {
    tier,
    t1: String(pT1.no),
    t2: String(pT2.no),
    t3: String(proRanking[2].no),
    metrics: {
      reliability: Number(reliability.toFixed(2)),
      prob: Number(prob.toFixed(1)),
      suitability: Number(suitability.toFixed(2)),
      records,
      v9T1Prob: Number(v9p.toFixed(1)),
      t2Reliability: Number(t2Rel.toFixed(2)),
    },
  };
}

function buildRaceEntry(proRace, v9Race) {
  const proRk = proRace.proRanking || [];
  const sel = classifyTier(proRk, v9Race);
  let action = 'skip';
  let reasons = [];
  let riskFlags = [];

  if (sel) {
    action = sel.tier === 'strong' ? 'play-strong' : 'play-banker';
    reasons = [
      `tier-${sel.tier}`,
      `rel=${sel.metrics.reliability}`,
      `prob=${sel.metrics.prob}%`,
      `suit=${sel.metrics.suitability}`,
      `records=${sel.metrics.records}`,
      `v9-t1-prob=${sel.metrics.v9T1Prob}%`,
      `t2-rel=${sel.metrics.t2Reliability}`,
    ];
  } else if (v9Race?.recommendations?.action !== 'play') {
    riskFlags.push('v9-gate-skip');
  } else if (proRk.length >= 3) {
    const t1V9 = v9OfRunner(v9Race, proRk[0].no);
    const r = t1V9?.reliability ?? 0;
    const p = proRk[0].prob || 0;
    const s = t1V9?.groups?.suitability ?? 0;
    const v9p = v9T1Prob(v9Race);
    const t2r = v9OfRunner(v9Race, proRk[1].no)?.reliability ?? 0;
    if (r < 0.50) riskFlags.push(`low-rel:${r.toFixed(2)}`);
    if (p < 10) riskFlags.push(`low-prob:${p.toFixed(1)}%`);
    if (s < 0.60) riskFlags.push(`low-suit:${s.toFixed(2)}`);
    if (v9p < 14) riskFlags.push(`low-v9-t1-prob:${v9p.toFixed(1)}%`);
    if (t2r < 0.50) riskFlags.push(`low-t2-rel:${t2r.toFixed(2)}`);
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
      tier: sel?.tier ?? null,
      reasons,
      riskFlags,
    },
    recommend: sel
      ? {
          tier: sel.tier,
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
  const v9MapForDate = new Map();
  for (const r of (v9Data.races || [])) v9MapForDate.set(r.raceNo, r);

  const races = (proData.races || [])
    .filter((r) => r.proRanking && r.proRanking.length > 0)
    .map((r) => buildRaceEntry(r, v9MapForDate.get(r.raceNo)));

  return {
    date,
    venue: proData.venue || '',
    model: 'v11-tiered-pro-v9-ensemble',
    policy: {
      tierS: TIER_S,
      tierB: TIER_B,
      stakeUnit: 10,
      defaultRule: [
        'V11 Tier S = Tier B + records >= 10. 落連贏單注。',
        'V11 Tier B = V9 gate=play AND Pro T1 reliability >= 0.50 AND Pro T1 prob >= 10%',
        '             AND suitability >= 0.60 AND V9 T1 prob >= 14% AND Pro T2 reliability >= 0.50.',
        '             落連贏膽拖 (Top1+Top2, Top1+Top3).',
      ].join(' '),
    },
    races,
  };
}

function writeOutput(payload) {
  const outPath = paths.backtestWritePath('v11', payload.date);
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
  let strongPlay = 0, bankerPlay = 0, totalRaces = 0;
  for (const date of dates) {
    const out = processDate(date);
    if (!out) continue;
    const sCount = out.races.filter((r) => r.recommendations.tier === 'strong').length;
    const bCount = out.races.filter((r) => r.recommendations.tier === 'banker').length;
    strongPlay += sCount;
    bankerPlay += bCount;
    totalRaces += out.races.length;
    const outPath = writeOutput(out);
    console.log(`  ${date}: ${out.races.length} races, ${sCount} strong, ${bCount} banker → ${outPath}`);
  }
  console.log(`\nTotal: ${dates.length} 日 / ${totalRaces} 場 / Tier S ${strongPlay} / Tier B (incl S) ${strongPlay + bankerPlay}`);
}

if (require.main === module) main();

module.exports = { classifyTier, buildRaceEntry, processDate, TIER_S, TIER_B };
