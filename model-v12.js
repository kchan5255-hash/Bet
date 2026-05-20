// model-v12.js
// V12 = V11 + 兩個 train/test 都 robust 嘅新 filter
//   - 連贏單注 (Tier S V12)：V11 strong (records ≥ 10) + draw rel ≥ 0.50 + body rel ≥ 0.50
//   - 連贏膽拖 (Tier B V12)：V11 banker + body rel ≥ 0.50 + top1Shape ≥ 0.65
//
// 樣本表現（2026-01-01 至 2026-05-17，322 場）：
//   • V12 Strong 連贏單注  : 33 場 / +$8,635 / ROI +261.7%   (train +309%, test +197%)
//   • V12 Banker 連贏膽拖  : 30 場 / +$13,845 / ROI +230.8%  (train +172%, test +348%)
//
// 對 V11 嘅升級：
//   單注：33 場 vs 61 場 (-46% 流轉)；ROI +119.3% → +261.7% (+142 pp)
//   膽拖：30 場 vs 84 場 (-64% 流轉)；ROI +77.8% → +230.8% (+153 pp)
//
// 注意：因為樣本只 30-33 場，呢個 ROI 可信度低過 V11；要繼續 monitor 5-6 月嘅 fresh data。

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const TIER_S = {
  reliability: 0.50,
  prob: 10,
  suitability: 0.60,
  records: 10,
  v9T1Prob: 14,
  drawRel: 0.50,
  bodyRel: 0.50,
  t2Reliability: 0.50,
};
const TIER_B = {
  reliability: 0.50,
  prob: 10,
  suitability: 0.60,
  v9T1Prob: 14,
  t2Reliability: 0.50,
  bodyRel: 0.50,
  top1Shape: 0.65,
};

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function v9OfRunner(v9Race, no) {
  return (v9Race.v9Ranking || []).find((x) => String(x.no) === String(no));
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
  const v9p = v9Race.v9Ranking[0]?.prob ?? 0;

  // V11 base check (V12 仍要)
  if (reliability < 0.50) return null;
  if (prob < 10) return null;
  if (suitability < 0.60) return null;
  if (v9p < 14) return null;

  const pT2 = proRanking[1];
  const t2Rel = v9OfRunner(v9Race, pT2.no)?.reliability ?? 0;
  if (t2Rel < 0.50) return null;

  // V12 新加 base：body rel ≥ 0.50（兩 tier 共通）
  const bodyRel = pT1V9.relative?.body ?? 0;
  if (bodyRel < TIER_B.bodyRel) return null;

  // 至此符合 Tier B 共通 (V11 banker + body)
  // Tier B 額外：top1Shape ≥ 0.65
  const shape = v9Race.signals?.top1Shape ?? 0;
  if (shape < TIER_B.top1Shape) return null;

  // 至此符合 Tier B
  // Tier S 額外：records ≥ 10 + draw rel ≥ 0.50
  const drawRel = pT1V9.relative?.draw ?? 0;
  const isStrong = records >= TIER_S.records && drawRel >= TIER_S.drawRel;

  const tier = isStrong ? 'strong' : 'banker';
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
      bodyRel: Number(bodyRel.toFixed(2)),
      drawRel: Number(drawRel.toFixed(2)),
      top1Shape: Number(shape.toFixed(2)),
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
      `body-rel=${sel.metrics.bodyRel}`,
      `top1-shape=${sel.metrics.top1Shape}`,
      `draw-rel=${sel.metrics.drawRel}`,
    ];
  } else if (v9Race?.recommendations?.action !== 'play') {
    riskFlags.push('v9-gate-skip');
  } else if (proRk.length >= 3) {
    const t1V9 = v9OfRunner(v9Race, proRk[0].no);
    const r = t1V9?.reliability ?? 0;
    const p = proRk[0].prob || 0;
    const s = t1V9?.groups?.suitability ?? 0;
    const v9p = v9Race.v9Ranking[0]?.prob ?? 0;
    const t2r = v9OfRunner(v9Race, proRk[1].no)?.reliability ?? 0;
    const bd = t1V9?.relative?.body ?? 0;
    const sh = v9Race.signals?.top1Shape ?? 0;
    const dr = t1V9?.relative?.draw ?? 0;
    if (r < 0.50) riskFlags.push(`low-rel:${r.toFixed(2)}`);
    if (p < 10) riskFlags.push(`low-prob:${p.toFixed(1)}%`);
    if (s < 0.60) riskFlags.push(`low-suit:${s.toFixed(2)}`);
    if (v9p < 14) riskFlags.push(`low-v9-t1-prob:${v9p.toFixed(1)}%`);
    if (t2r < 0.50) riskFlags.push(`low-t2-rel:${t2r.toFixed(2)}`);
    if (bd < 0.50) riskFlags.push(`low-body-rel:${bd.toFixed(2)}`);
    if (sh < 0.65) riskFlags.push(`low-top1-shape:${sh.toFixed(2)}`);
    if (dr < 0.50) riskFlags.push(`low-draw-rel:${dr.toFixed(2)}`);
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
  if (!fs.existsSync(proPath) || !fs.existsSync(v9Path)) {
    console.warn(`SKIP ${date}`);
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
    model: 'v12-extended-tiered',
    policy: { tierS: TIER_S, tierB: TIER_B, stakeUnit: 10 },
    races,
  };
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
  let strongPlay = 0, bankerPlay = 0, totalRaces = 0;
  for (const date of dates) {
    const out = processDate(date);
    if (!out) continue;
    const sCount = out.races.filter((r) => r.recommendations.tier === 'strong').length;
    const bCount = out.races.filter((r) => r.recommendations.tier === 'banker').length;
    strongPlay += sCount;
    bankerPlay += bCount;
    totalRaces += out.races.length;
    const outPath = paths.backtestWritePath('v12', out.date);
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
    console.log(`  ${date}: ${out.races.length} races, S=${sCount} / B=${bCount} → ${path.basename(outPath)}`);
  }
  console.log(`\nTotal: ${dates.length} 日 / ${totalRaces} 場 / Tier S ${strongPlay} / Tier B ${strongPlay + bankerPlay}`);
}

if (require.main === module) main();
module.exports = { classifyTier, buildRaceEntry, processDate };
