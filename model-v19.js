// model-v19.js
// V19 = V18 + distance filter
//
// 三年 by-distance 分析發現：
//   • 1400m / 1600m → 強 alpha（V18 ROI +140% / +76%）
//   • 1200m → 穩定（+21%）
//   • 1800m → 微正（+5%）
//   • 1000m / 1650m / 2000m+ → 三年皆負，系統性蝕
//
// V19 改動：
//   1. distance ∈ {1000, 1650, 2000, 2200} → skip（hard filter）
//   2. distance ∈ {1400, 1600} → score +1.5（middle boost）
//
// 預期效果（基於 sweep）：
//   • V18 base       : 697 場 / +31.1% / +$46,273
//   • V19 (distance) : ~531 場 / +47.5% / +$54,240
//
// 用法：
//   node model-v19.js
//   node model-v19.js 2026-05-20
//   USE_SUPABASE=1 node model-v19.js 2026-05-20             ← 寫結果入 v19_predictions
//   USE_SUPABASE=1 node model-v19.js --skip-if-loaded       ← 賽果已入 + 已算過嘅日期跳過

const fs = require('fs');
const path = require('path');
const paths = require('./paths');
const v18 = require('./model-v18');

const USE_SUPABASE = process.env.USE_SUPABASE === '1';
const SKIP_IF_LOADED = process.argv.includes('--skip-if-loaded');

const SKIP_DISTANCES = new Set([1000, 1650, 2000, 2200]);
const MIDDLE_DISTANCES = new Set([1400, 1600]);
const MIDDLE_BONUS = 1.5;

function tierFromScore(score) {
  if (score >= 3) return { tier: 'S', mul: 1.5 };
  if (score >= 1) return { tier: 'A', mul: 1.0 };
  if (score >= 0) return { tier: 'B', mul: 0.7 };
  return { tier: null, mul: 0 };
}

function applyDistanceFilter(v18Race) {
  const dist = Number(v18Race.meta?.distance) || 0;

  if (!dist || SKIP_DISTANCES.has(dist)) {
    return {
      ...v18Race,
      model: 'v19-skip-distance',
      v19: {
        action: 'skip',
        reason: dist ? `bad-distance=${dist}m` : 'unknown-distance',
        v18Tier: v18Race.v18?.tier || null,
        v18Score: v18Race.v18?.score ?? null,
      },
      v18: v18Race.v18 ? { ...v18Race.v18, suppressedBy: 'v19-distance' } : null,
      recommend: null,
    };
  }

  if (!v18Race.v18 || v18Race.v18.action === 'skip' || !v18Race.recommend) {
    return {
      ...v18Race,
      model: v18Race.model === 'v18-skip' ? 'v19-skip' : v18Race.model,
      v19: { action: 'skip', reason: v18Race.v18?.action === 'skip' ? 'v18-skip' : 'no-pick' },
    };
  }

  if (MIDDLE_DISTANCES.has(dist)) {
    const newScore = (v18Race.v18.score || 0) + MIDDLE_BONUS;
    const t = tierFromScore(newScore);
    if (!t.tier) {
      return {
        ...v18Race,
        model: 'v19-skip',
        v19: { action: 'skip', reason: 'middle-but-score-too-low', v18Tier: v18Race.v18.tier },
        recommend: null,
      };
    }
    return {
      ...v18Race,
      model: 'v19',
      v18: {
        ...v18Race.v18,
        tier: t.tier,
        stakeMul: t.mul,
        score: newScore,
        reasons: [...(v18Race.v18.reasons || []), `middle-boost=${MIDDLE_BONUS}`],
      },
      v19: {
        action: 'play',
        tier: t.tier,
        stakeMul: t.mul,
        boost: 'middle',
        v18Tier: v18Race.v18.tier,
        v18Score: v18Race.v18.score,
      },
    };
  }

  return {
    ...v18Race,
    model: 'v19',
    v19: {
      action: 'play',
      tier: v18Race.v18.tier,
      stakeMul: v18Race.v18.stakeMul,
      boost: null,
      v18Tier: v18Race.v18.tier,
      v18Score: v18Race.v18.score,
    },
  };
}

async function shouldSkip(date) {
  if (!SKIP_IF_LOADED || !USE_SUPABASE) return false;
  try {
    const { isResultsLoaded, loadV19PredictionsByDate } = require('./supabase-data');
    const resultsIn = await isResultsLoaded(date);
    if (!resultsIn) return false;
    const existing = await loadV19PredictionsByDate(date);
    if (!existing.length) return false;
    return existing.every(
      (r) => r.mode === 'post' && Array.isArray(r.actual_top3) && r.actual_top3.length > 0,
    );
  } catch (err) {
    console.warn(`shouldSkip(${date}): ${err.message}, fall back to recompute`);
    return false;
  }
}

async function writeToSupabase(date, out) {
  if (!USE_SUPABASE) return;
  try {
    const { v19RowFromRace, upsertV19Predictions } = require('./supabase-data');
    const rows = (out.races || []).map((r) =>
      v19RowFromRace(date, out.venue, r, out.mode || 'post'),
    );
    if (!rows.length) return;
    const { count } = await upsertV19Predictions(rows);
    console.log(`  ↳ Supabase v19_predictions upsert ${count} rows`);
  } catch (err) {
    console.warn(`Supabase upsert failed for ${date}: ${err.message}`);
  }
}

async function processDate(date) {
  const v18Out = await v18.processDate(date);
  if (!v18Out) return null;
  const races = (v18Out.races || []).map(applyDistanceFilter);
  return { date, venue: v18Out.venue, model: 'v19', mode: v18Out.mode || 'post', races };
}

async function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const dates = [];
  if (args.length) dates.push(...args);
  else {
    for (const yr of ['2024', '2025', '2026']) {
      const dir = path.join(paths.DIRS.backtest, 'v14', yr);
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        const m = f.match(/(\d{4}-\d{2}-\d{2})/);
        if (m) dates.push(m[1]);
      }
    }
    dates.sort();
  }

  let totalRaces = 0, totalPlay = 0, totalS = 0, totalA = 0, totalB = 0;
  let totalSkipDist = 0, totalSkipOther = 0, totalSkipDates = 0;
  for (const date of dates) {
    if (await shouldSkip(date)) {
      totalSkipDates++;
      console.log(`  ${date}: 已算過 (post + actualTop3 齊)，skip`);
      continue;
    }
    const out = await processDate(date);
    if (!out) continue;
    for (const r of out.races) {
      totalRaces++;
      if (r.v19?.action === 'play') {
        totalPlay++;
        if (r.v19.tier === 'S') totalS++;
        else if (r.v19.tier === 'A') totalA++;
        else if (r.v19.tier === 'B') totalB++;
      } else if (r.model === 'v19-skip-distance') totalSkipDist++;
      else totalSkipOther++;
    }
    fs.writeFileSync(paths.backtestWritePath('v19', date), JSON.stringify(out, null, 2), 'utf8');
    await writeToSupabase(date, out);
  }
  const skipMsg = totalSkipDates ? ` / skip-dates=${totalSkipDates}` : '';
  console.log(`V19: ${dates.length} 日 / ${totalRaces} 場 / play=${totalPlay} (S=${totalS} A=${totalA} B=${totalB}) / skip-dist=${totalSkipDist} / skip-other=${totalSkipOther}${skipMsg}`);
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
module.exports = { processDate, applyDistanceFilter };
