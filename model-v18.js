// model-v18.js
// V18 = V14 ensemble (V12 + V13) + j×t boost / weight delta gate / draw bonus
//
// V14 base：V12 + V13 50/50 ensemble，連贏膽拖 +25.6% / 三年皆正
// V18 加 race-level features:
//   1. j×t combo 勝率 ≥ 18%（頂級配搭）→ Tier S（boost）
//   2. j×t combo 勝率 < 6%（差配搭）→ skip
//   3. 體重變動 |bodyWeight Δ| > 30 lb → 警號（risk flag）
//   4. 內檔 draw 1-4 → 加分；外檔 11+ → 減分
//   5. 班次 1-2（高班）→ 加分（穩定）
//
// 注意：唔加賠率 odds（user explicit 唔要）
//
// 用法：
//   node model-v18.js
//   node model-v18.js 2026-05-21

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const ROOT = paths.ROOT;
const USE_SUPABASE = process.argv.includes('--supabase') || process.env.USE_SUPABASE === '1';

// ===== 載 j×t stats =====
const JT_STATS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/jt-stats.json'), 'utf8'));
const jStats = JT_STATS.jockey;
const tStats = JT_STATS.trainer;
const comboStats = JT_STATS.combo;

function jtComboTier(jockey, trainer) {
  if (!jockey || !trainer) return 'unknown';
  const k = jockey + '||' + trainer;
  const s = comboStats[k];
  if (!s || s.runs < 20) return 'unknown';
  const wr = s.wins / s.runs;
  if (wr >= 0.18) return 'elite';
  if (wr >= 0.10) return 'good';
  if (wr >= 0.06) return 'avg';
  return 'below';
}

function jockeyWR(jockey) {
  const s = jStats[jockey];
  if (!s || s.runs < 50) return null;
  return s.wins / s.runs;
}

function trainerWR(trainer) {
  const s = tStats[trainer];
  if (!s || s.runs < 50) return null;
  return s.wins / s.runs;
}

// ===== 載 horses（本機模式）=====
const HORSES_FILES = [
  'horses-all.json','horses-janmar.json','horses-apr5days.json',
  'horses-3days.json','horses-2026-05-09.json','horses-2026-05-17.json',
  'horses-513-missing.json',
];
const horseByCode = new Map();

function loadHorsesLocal() {
  for (const fn of HORSES_FILES) {
    const fp = path.join(paths.DIRS.horses, fn);
    if (!fs.existsSync(fp)) continue;
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    for (const h of data.horses || []) {
      if (!horseByCode.has(h.code) || (h.records?.length || 0) > (horseByCode.get(h.code).records?.length || 0)) {
        horseByCode.set(h.code, h);
      }
    }
  }
}

if (!USE_SUPABASE) loadHorsesLocal();

async function ensureHorsesForResults(resultsByDate) {
  if (!USE_SUPABASE) return;
  const { loadHorsesByCodes } = require('./supabase-data');
  const codes = new Set();
  for (const res of resultsByDate) {
    for (const r of res?.races || []) {
      for (const run of r.runners || []) {
        if (run.code) codes.add(run.code);
      }
    }
  }
  if (!codes.size) return;
  const sbMap = await loadHorsesByCodes([...codes]);
  for (const [code, h] of sbMap) horseByCode.set(code, h);
}

// ===== 工具 =====
function parseDateDMY(v) {
  const m = String(v||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const yr = m[3].length === 4 ? Number(m[3]) : 2000 + Number(m[3]);
  return new Date(Date.UTC(yr, Number(m[2])-1, Number(m[1])));
}

function num(v) {
  const n = Number(String(v||'').replace(/[^0-9.\-]/g,''));
  return Number.isFinite(n) ? n : 0;
}

// 取上場 bodyWeight，比較今場 actual weight delta
function weightFeatures(horse, raceDate) {
  if (!horse?.records?.length) return { lastBodyWeight: null, lastActWt: null, bodyDelta: null };
  const past = horse.records.filter(r => {
    const d = parseDateDMY(r.date);
    return d && d < raceDate;
  });
  if (!past.length) return { lastBodyWeight: null, lastActWt: null, bodyDelta: null };
  const last = past[0];
  const prev = past[1];
  const lastBW = num(last.bodyWeight);
  const prevBW = prev ? num(prev.bodyWeight) : null;
  return {
    lastBodyWeight: lastBW || null,
    lastActWt: num(last.actWt) || null,
    bodyDelta: (lastBW && prevBW) ? (lastBW - prevBW) : null,
  };
}

function classNum(name) {
  if (!name) return null;
  const m = String(name).match(/第(\S+?)班/);
  if (!m) return null;
  return { '一':1, '二':2, '三':3, '四':4, '五':5 }[m[1]] || null;
}

// ===== 載 V14 同 V9 backtest =====
function loadV14(date) {
  const fp = path.join(paths.DIRS.backtest, 'v14', date.slice(0,4), `backtest-v14-${date}.json`);
  return fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf8')) : null;
}

function loadResultsAny(date) {
  const real = paths.resultsFullPath(date);
  if (fs.existsSync(real)) {
    return { data: JSON.parse(fs.readFileSync(real, 'utf8')), mode: 'post' };
  }
  if (typeof paths.resultsPreRacePath === 'function') {
    const pre = paths.resultsPreRacePath(date);
    if (fs.existsSync(pre)) {
      return { data: JSON.parse(fs.readFileSync(pre, 'utf8')), mode: 'pre' };
    }
  }
  return null;
}

// ===== Score race level =====
function scoreRaceLevel(top1Runner, raceMeta, fieldSize, raceDate) {
  const horse = horseByCode.get(top1Runner.code);
  const wf = weightFeatures(horse, raceDate);
  const cls = classNum(raceMeta.className);
  const draw = Number(top1Runner.draw) || 0;

  const jt = jtComboTier(top1Runner.jockey, top1Runner.trainer);
  const jWR = jockeyWR(top1Runner.jockey);
  const tWR = trainerWR(top1Runner.trainer);

  let score = 0;
  const reasons = [];
  const flags = [];

  // j×t combo
  if (jt === 'elite') { score += 3; reasons.push('jt-elite'); }
  else if (jt === 'good') { score += 1; reasons.push('jt-good'); }
  else if (jt === 'below') { score -= 2; flags.push('jt-below'); }

  // jockey 質素
  if (jWR != null) {
    if (jWR >= 0.12) { score += 1; reasons.push(`j-elite=${(jWR*100).toFixed(1)}%`); }
    else if (jWR < 0.07) { score -= 1; flags.push(`j-weak=${(jWR*100).toFixed(1)}%`); }
  }

  // trainer 質素
  if (tWR != null) {
    if (tWR >= 0.10) { score += 0.5; reasons.push(`t-elite=${(tWR*100).toFixed(1)}%`); }
    else if (tWR < 0.06) { score -= 0.5; flags.push(`t-weak=${(tWR*100).toFixed(1)}%`); }
  }

  // 內檔
  if (draw >= 1 && draw <= 4) { score += 0.5; reasons.push(`draw=${draw}`); }
  else if (draw >= 11) { score -= 0.5; flags.push(`draw-out=${draw}`); }

  // 高班
  if (cls === 1 || cls === 2) { score += 0.5; reasons.push(`class=${cls}`); }

  // 體重急變
  if (wf.bodyDelta != null && Math.abs(wf.bodyDelta) > 30) {
    score -= 1;
    flags.push(`body-delta=${wf.bodyDelta}`);
  }

  return { score, reasons, flags, jt, jWR, tWR, draw, cls, ...wf };
}

// ===== Build entry =====
function buildRaceEntry(v14Race, resultsRace, raceDate) {
  if (!v14Race?.recommend?.bets?.length) {
    return { ...v14Race, model: 'v18-skip' };
  }

  const t1Combo = v14Race.recommend.qinT12.combo.split(',');
  const top1No = t1Combo[0];
  const top1Runner = resultsRace.runners.find(r => String(r.no) === top1No);
  if (!top1Runner) return v14Race;

  const fieldSize = resultsRace.runners.length;
  const r18 = scoreRaceLevel(top1Runner, resultsRace.meta || {}, fieldSize, raceDate);

  // Tier 決定
  // V14 base = play
  // V18 升級：
  //   - score ≥ 3 → 'tier-S' (boost stake 1.5x)
  //   - score 1-3 → 'tier-A' (1.0x)
  //   - score 0-1 → 'tier-B' (0.7x, 保守)
  //   - score < 0 → 'skip'
  let tier, stakeMul = 1.0;
  if (r18.score >= 3) { tier = 'S'; stakeMul = 1.5; }
  else if (r18.score >= 1) { tier = 'A'; stakeMul = 1.0; }
  else if (r18.score >= 0) { tier = 'B'; stakeMul = 0.7; }
  else { tier = null; stakeMul = 0; }

  if (tier === null) {
    return {
      ...v14Race,
      model: 'v18-skip',
      v18: { score: r18.score, reasons: r18.reasons, flags: r18.flags, action: 'skip' },
      recommend: null,
    };
  }

  return {
    ...v14Race,
    model: 'v18',
    v18: {
      tier,
      score: r18.score,
      stakeMul,
      reasons: r18.reasons,
      flags: r18.flags,
      jtCombo: r18.jt,
      jWinRate: r18.jWR,
      tWinRate: r18.tWR,
      draw: r18.draw,
      class: r18.cls,
      lastBodyWeight: r18.lastBodyWeight,
      bodyDelta: r18.bodyDelta,
    },
  };
}

async function processDate(date) {
  const v14 = loadV14(date);
  if (!v14) return null;

  const resInfo = loadResultsAny(date);
  const res = resInfo?.data || null;
  const mode = resInfo?.mode || 'post';

  // graceful 降級：無 results 時直接返 V14（保留 v14 既有 recommend）
  if (!res) {
    return { date, venue: v14.venue, model: 'v14-passthrough', mode: 'pre-no-results', races: v14.races || [] };
  }

  if (USE_SUPABASE) await ensureHorsesForResults([res]);

  const raceDate = new Date(date + 'T00:00:00+08:00');
  const resByNo = new Map();
  for (const r of res.races || []) resByNo.set(r.raceNo, r);

  const races = (v14.races || []).map(v14Race => {
    const resultsRace = resByNo.get(v14Race.raceNo);
    if (!resultsRace) return v14Race;
    return buildRaceEntry(v14Race, resultsRace, raceDate);
  });

  return { date, venue: v14.venue, model: 'v18', mode, races };
}

async function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const dates = [];
  if (args.length) dates.push(...args);
  else {
    for (const yr of ['2024','2025','2026']) {
      const dir = path.join(paths.DIRS.backtest, 'v14', yr);
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        const m = f.match(/(\d{4}-\d{2}-\d{2})/);
        if (m) dates.push(m[1]);
      }
    }
    dates.sort();
  }
  let totalRaces = 0, totalS = 0, totalA = 0, totalB = 0, totalSkip = 0;
  for (const date of dates) {
    const out = await processDate(date);
    if (!out) continue;
    for (const r of out.races) {
      totalRaces++;
      if (r.v18?.tier === 'S') totalS++;
      else if (r.v18?.tier === 'A') totalA++;
      else if (r.v18?.tier === 'B') totalB++;
      else if (r.v18?.action === 'skip' || r.model === 'v18-skip') totalSkip++;
    }
    fs.writeFileSync(paths.backtestWritePath('v18', date), JSON.stringify(out, null, 2), 'utf8');
  }
  console.log(`V18: ${dates.length} 日 / ${totalRaces} 場 / S=${totalS} / A=${totalA} / B=${totalB} / skip=${totalSkip}`);
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
module.exports = { processDate, buildRaceEntry, scoreRaceLevel, jtComboTier };
