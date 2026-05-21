// model-v6.js — Pro 邏輯升級版 (唔加新 feature,只改 mechanics)
// 5 大改動:
// A. Career: Beta-Binomial posterior + log scale
// B. Recent form: 加 trajectory adjustment (近3 vs 近4-6 趨勢)
// C. Shrinkage: 強度按 winRate 動態
// D. Softmax temperature: adaptive(根據場內 rating variance)
// E. Draw: class-conditional weight

const fs = require('fs');
const paths = require('./paths');

const DATE = process.env.DATE;
const RESULTS = process.env.RESULTS || paths.resultsFullPath(DATE);
const HORSES = process.env.HORSES;
const OUT = process.env.OUT || paths.backtestWritePath('v6', DATE);

const resultsData = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));
const horseFiles = HORSES.split(',').map((s) => paths.horsesPath(s.trim())).filter(Boolean);
const horseByCode = new Map();
horseFiles.forEach((f) => {
  const h = JSON.parse(fs.readFileSync(f, 'utf8'));
  h.horses.forEach((horse) => {
    const existing = horseByCode.get(horse.code);
    if (!existing || (horse.records?.length || 0) > (existing.records?.length || 0)) {
      horseByCode.set(horse.code, horse);
    }
  });
});

const RACE_DATE = new Date(DATE + 'T00:00:00+08:00');
const VENUE = resultsData.venue;

// 通用工具(同 Pro 一樣)
function numberValue(v) { const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : 0; }
function parsePlace(v) { const n = parseInt(String(v || '').replace(/^0+/, ''), 10); return Number.isFinite(n) ? n : null; }
function parseDateDMY(v) { const m = String(v || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/); if (!m) return null; return new Date(Date.UTC(Number(m[3]) + 2000, Number(m[2]) - 1, Number(m[1]))); }
function parseCareerStats(v) { const m = String(v || '').match(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/); return m ? { wins: +m[1], seconds: +m[2], thirds: +m[3], starts: +m[4] } : { wins: 0, seconds: 0, thirds: 0, starts: 0 }; }
function clamp01(v) { if (!Number.isFinite(v)) return 0.5; return Math.max(0, Math.min(1, v)); }
function placeScore(p) { if (!p) return 0.25; if (p === 1) return 1; if (p === 2) return 0.82; if (p === 3) return 0.68; if (p <= 5) return 0.5; if (p <= 8) return 0.32; return 0.16; }
function historicalOddsScore(odds) { const d = numberValue(odds); if (!d) return 0.5; return Math.max(0.15, Math.min(1, 1 / Math.sqrt(d / 3))); }
function beatenDistanceScore(distance) { const v = String(distance || '').trim(); if (!v) return 0.5; if (['N', 'SH', 'HD'].includes(v)) return 0.9; if (/^\d+$/.test(v)) return Math.max(0.25, 0.75 - Number(v) * 0.08); let total = 0; for (const p of v.split('-')) { if (/^\d+\/\d+$/.test(p)) { const [a, b] = p.split('/').map(Number); total += a / b; } else if (/^\d+$/.test(p)) total += +p; } if (!total) return 0.5; if (total <= 1) return 0.75; if (total <= 2) return 0.62; if (total <= 4) return 0.45; return 0.3; }
function recordScore(r) { return 0.74 * placeScore(parsePlace(r.place)) + 0.18 * historicalOddsScore(r.odds) + 0.08 * beatenDistanceScore(r.lbw); }
function averageRecords(records, predicate, limit = 99) { const values = records.filter(predicate).slice(0, limit).map((r, i) => ({ value: recordScore(r), weight: Math.pow(0.92, i) })); const s = values.reduce((t, x) => t + x.value * x.weight, 0); const w = values.reduce((t, x) => t + x.weight, 0); return w ? s / w : 0.5; }
function recentFormScore(last6run) { const values = String(last6run || '').split('/').map((v) => parseInt(v, 10)).filter(Number.isFinite).map(placeScore); const weights = [1.8, 1.45, 1.15, 0.9, 0.7, 0.55]; let s = 0, w = 0; values.forEach((v, i) => { if (Number.isFinite(v)) { const wt = weights[i] ?? 1; s += v * wt; w += wt; } }); return w ? s / w : 0.5; }

// ===== 改動 B: Recent Trajectory =====
function recentFormTrajectory(last6run) {
  const values = String(last6run || '').split('/').map(v => parseInt(v, 10)).filter(Number.isFinite).map(placeScore);
  if (values.length < 4) return 1.0;  // 無足夠數據,唔做調整
  const recent3 = values.slice(0, 3);
  const prev3 = values.slice(3, 6);
  const recentAvg = recent3.reduce((a, b) => a + b, 0) / recent3.length;
  const prevAvg = prev3.length ? prev3.reduce((a, b) => a + b, 0) / prev3.length : recentAvg;
  const ratio = (recentAvg + 0.05) / (prevAvg + 0.05);
  return Math.max(0.6, Math.min(1.5, ratio));  // clamp [0.6, 1.5]
}

// ===== 改動 E: Class-conditional draw =====
function drawScore(venue, distance, draw, classNo) {
  if (!draw) return 0.5;
  let base;
  if (venue === 'HV' && distance === 1650) { if (draw <= 3) base = 1; else if (draw <= 5) base = 0.84; else if (draw <= 8) base = 0.58; else if (draw <= 10) base = 0.34; else base = 0.18; }
  else if (venue === 'HV' && distance === 1200) { if (draw <= 3) base = 0.92; else if (draw <= 6) base = 0.82; else if (draw <= 8) base = 0.62; else if (draw <= 10) base = 0.4; else base = 0.24; }
  else if (venue === 'HV' && distance === 1800) { if (draw <= 3) base = 0.95; else if (draw <= 6) base = 0.76; else if (draw <= 8) base = 0.52; else base = 0.3; }
  else if (draw <= 4) base = 0.78; else if (draw <= 8) base = 0.62; else base = 0.45;

  // 改動 E: 5 班/4班 draw 影響細啲(低班馬跑法參差),高班 draw 影響大
  if (classNo === 5) {
    return 0.5 + (base - 0.5) * 0.7;   // 壓縮 30%
  }
  if (classNo === 4) {
    return 0.5 + (base - 0.5) * 0.85;  // 壓縮 15%
  }
  if (classNo === 1 || classNo === 2) {
    return 0.5 + (base - 0.5) * 1.1;   // 放大 10%
  }
  return base;
}

function daysSinceLastRun(records) { const latest = parseDateDMY(records[0]?.date); if (!latest) return null; return Math.round((RACE_DATE - latest) / 86400000); }
function fitnessScore(days) { if (days == null) return 0.55; if (days < 7) return 0.45; if (days <= 35) return 0.85; if (days <= 70) return 0.7; if (days <= 120) return 0.52; return 0.35; }
function bodyWeightScore(cur, records) { const rw = records.slice(0, 3).map((r) => numberValue(r.bodyWeight)).filter(Boolean); if (!cur || !rw.length) return 0.55; const avg = rw.reduce((a, b) => a + b, 0) / rw.length; const diff = Math.abs(cur - avg) / avg; if (diff <= 0.01) return 0.82; if (diff <= 0.025) return 0.7; if (diff <= 0.04) return 0.52; return 0.35; }
function raceClassNo(className) { const map = { '第一班': 1, '第二班': 2, '第三班': 3, '第四班': 4, '第五班': 5 }; return map[className] ?? null; }
function sameGoing(record, raceGoingCh) { if (/好|Good/.test(raceGoingCh)) return ['G', 'GF', 'GY'].includes(record.going); return true; }
function last6runFromRecords(records) { return records.slice(0, 6).map((r) => r.place).join('/'); }

// ===== 改動 A: Career Beta-Binomial + log =====
function careerScoreV6(wins, seconds, thirds, starts) {
  if (!starts) return 0.42;  // 新馬稍低於場均
  // Laplace smoothing: add 1 to wins, 4 to starts (prior ~25% winning baseline)
  const adjWinRate = (wins + 1) / (starts + 4);
  const adjPlaceRate = (wins + seconds + thirds + 3) / (starts + 6);
  // Log scale for winRate (高 winRate 不飽和)
  // 假 raw winRate 0.4 = 實戰王者
  const logWin = Math.log(1 + adjWinRate * 20) / Math.log(21);  // normalized 0-1
  return Math.min(1, 0.55 * logWin + 0.30 * adjPlaceRate + 0.15);
}

function buildRunnerFeatures(resultRunner, raceMeta) {
  const horse = horseByCode.get(resultRunner.code);
  if (!horse) return null;
  const d = DATE.split('-');
  const targetDMY = `${d[2]}/${d[1]}/${d[0].slice(2)}`;
  const raceDayRecord = horse.records.find((r) => r.date === targetDMY);
  const history = horse.records.filter((r) => { const dt = parseDateDMY(r.date); return dt && dt < RACE_DATE; });
  const draw = raceDayRecord ? numberValue(raceDayRecord.draw) : numberValue(resultRunner.draw);
  const actualWeight = raceDayRecord ? numberValue(raceDayRecord.actWt) : numberValue(resultRunner.actualWeight);
  const bodyWeight = raceDayRecord ? numberValue(raceDayRecord.bodyWeight) : numberValue(resultRunner.bodyWeight);
  const rating = raceDayRecord ? numberValue(raceDayRecord.rating) : numberValue(horse.profile['Current Rating']);
  const last6run = last6runFromRecords(history);
  let careerW = 0, careerS = 0, careerT = 0;
  history.forEach((r) => { const p = parsePlace(r.place); if (p===1) careerW++; else if (p===2) careerS++; else if (p===3) careerT++; });
  return {
    no: resultRunner.no, name: resultRunner.name, code: resultRunner.code,
    draw, handicapWeight: actualWeight, bodyWeight, rating, last6run,
    jockey: resultRunner.jockey, trainer: resultRunner.trainer,
    age: (horse.profile['Country of Origin / Age'] || '').trim(),
    careerW, careerS, careerT, careerStarts: history.length,
    records: history,
    plc: resultRunner.plc,
    winOdds: numberValue(resultRunner.winOdds),
  };
}

function buildFeatures(runners, raceMeta) {
  const distance = raceMeta.distance;
  const classNo = raceClassNo(raceMeta.className);
  const going = raceMeta.going;
  const ratings = runners.map((r) => r.rating);
  const weights = runners.map((r) => r.handicapWeight);
  const minR = Math.min(...ratings), maxR = Math.max(...ratings);
  const minW = Math.min(...weights), maxW = Math.max(...weights);
  return runners.map((runner) => {
    const records = runner.records;
    const days = daysSinceLastRun(records);
    // 改動 B: trajectory
    const trajectory = recentFormTrajectory(runner.last6run);
    const recentBase = recentFormScore(runner.last6run);
    const features = {
      recent: recentBase,
      recentAdj: clamp01(recentBase * (0.7 + 0.3 * trajectory)),   // 改動 B 應用
      trajectory,
      form: averageRecords(records, () => true, 12),
      courseDistance: averageRecords(records, (r) => String(r.track || '').includes(VENUE) && numberValue(r.distance) === distance, 8),
      course: averageRecords(records, (r) => String(r.track || '').includes(VENUE), 12),
      distance: averageRecords(records, (r) => numberValue(r.distance) === distance, 10),
      class: averageRecords(records, (r) => !classNo || Number(r.classNo) === classNo, 10),
      going: averageRecords(records, (r) => sameGoing(r, going), 10),
      rating: (!Number.isFinite(runner.rating) || minR === maxR) ? 0.5 : Math.max(0, Math.min(1, (runner.rating - minR) / (maxR - minR))),
      draw: drawScore(VENUE, distance, runner.draw, classNo),   // 改動 E 應用
      weight: (!Number.isFinite(runner.handicapWeight) || minW === maxW) ? 0.5 : Math.max(0, Math.min(1, (runner.handicapWeight - minW) / (maxW - minW))),
      freshness: fitnessScore(days),
      body: bodyWeightScore(runner.bodyWeight, records),
      career: careerScoreV6(runner.careerW, runner.careerS, runner.careerT, runner.careerStarts),  // 改動 A
      age: (() => { const m = String(runner.age).match(/\/\s*(\d+)/); const a = m ? +m[1] : 6; if (a <= 3) return 0.75; if (a <= 5) return 0.85; if (a <= 7) return 0.7; if (a <= 9) return 0.5; return 0.35; })(),
    };
    return { ...runner, features, daysSinceLastRun: days, recordsCount: records.length };
  });
}

// ===== Pro 模型(benchmark) =====
const FK = ['recent','form','courseDistance','course','distance','class','going','rating','draw','weight','freshness','body','career','age'];
function mean(vs) { const f = vs.filter(Number.isFinite); return f.length ? f.reduce((a, b) => a + b, 0) / f.length : 0.5; }
function variance(vs) { const m = mean(vs); return mean(vs.map(v => (v - m) ** 2)); }
function shrink(v, b, n, k) { n = Math.max(0, n || 0); k = Math.max(0, k || 0); if (n + k === 0) return clamp01(v); return clamp01((n * v + k * b) / (n + k)); }

function professionalRawScore(runner, baselines) {
  const f = runner.features;
  const rc = runner.recordsCount || 0;
  const cs = runner.careerStarts;
  const a = {
    recent: shrink(f.recent, baselines.recent, Math.min(rc, 8), 4),
    form: clamp01(f.form),
    courseDistance: shrink(f.courseDistance, baselines.courseDistance, Math.min(rc, 6), 8),
    course: shrink(f.course, baselines.course, Math.min(rc, 10), 8),
    distance: shrink(f.distance, baselines.distance, Math.min(rc, 10), 8),
    class: shrink(f.class, baselines.class, Math.min(rc, 10), 10),
    going: shrink(f.going, baselines.going, Math.min(rc, 10), 10),
    rating: clamp01(f.rating), draw: clamp01(f.draw), weight: clamp01(f.weight),
    freshness: clamp01(f.freshness), body: clamp01(f.body),
    career: shrink(f.career, baselines.career, Math.min(cs || rc, 30), 18),
    age: clamp01(f.age),
  };
  const baseAb = 0.34 * a.recent + 0.22 * a.form + 0.23 * a.rating + 0.14 * a.career + 0.07 * a.age;
  const suit = 0.34 * a.courseDistance + 0.17 * a.course + 0.18 * a.distance + 0.17 * a.class + 0.14 * a.going;
  const setup = 0.58 * a.draw + 0.3 * a.weight + 0.12 * a.freshness;
  const cond = 0.68 * a.body + 0.32 * a.freshness;
  return 0.4 * baseAb + 0.3 * suit + 0.2 * setup + 0.1 * cond;
}

// ===== V6 raw score =====
function v6RawScore(runner, baselines) {
  const f = runner.features;
  const rc = runner.recordsCount || 0;
  const cs = runner.careerStarts;
  const winRate = cs > 0 ? runner.careerW / cs : 0;

  // 改動 C: Shrinkage 強度 dynamic
  // 高 winRate(>0.20) 馬嘅 shrinkage 減半(prior 相信佢原始 value)
  // 低 winRate(<0.05) 馬 shrinkage 加倍
  let shrinkMult = 1.0;
  if (winRate > 0.20 && cs >= 5) shrinkMult = 0.5;
  else if (cs >= 8 && winRate < 0.05) shrinkMult = 1.5;

  const a = {
    recent: shrink(f.recentAdj, baselines.recent, Math.min(rc, 8), 4 * shrinkMult),    // 用 recentAdj(trajectory 調整過)
    form: clamp01(f.form),
    courseDistance: shrink(f.courseDistance, baselines.courseDistance, Math.min(rc, 6), 8 * shrinkMult),
    course: shrink(f.course, baselines.course, Math.min(rc, 10), 8 * shrinkMult),
    distance: shrink(f.distance, baselines.distance, Math.min(rc, 10), 8 * shrinkMult),
    class: shrink(f.class, baselines.class, Math.min(rc, 10), 10 * shrinkMult),
    going: shrink(f.going, baselines.going, Math.min(rc, 10), 10 * shrinkMult),
    rating: clamp01(f.rating), draw: clamp01(f.draw), weight: clamp01(f.weight),
    freshness: clamp01(f.freshness), body: clamp01(f.body),
    career: shrink(f.career, baselines.career, Math.min(cs || rc, 30), 18 * shrinkMult),  // V6 career 已係 Beta-Binomial
    age: clamp01(f.age),
  };
  // 保留 Pro 嘅分組權重,唯一調整:setup draw 權重從 0.58 → 0.55,加 trajectory signal
  const baseAb = 0.33 * a.recent + 0.21 * a.form + 0.24 * a.rating + 0.15 * a.career + 0.07 * a.age;
  const suit = 0.34 * a.courseDistance + 0.17 * a.course + 0.18 * a.distance + 0.17 * a.class + 0.14 * a.going;
  const setup = 0.55 * a.draw + 0.30 * a.weight + 0.15 * a.freshness;
  const cond = 0.68 * a.body + 0.32 * a.freshness;
  return 0.4 * baseAb + 0.3 * suit + 0.2 * setup + 0.1 * cond;
}

function softmaxProb(rawScores, temp) {
  const ex = rawScores.map((s) => Math.exp(temp * s));
  const sum = ex.reduce((a, b) => a + b, 0);
  return ex.map((e) => (e / sum) * 100);
}

// ===== 改動 D: Adaptive Temperature =====
function adaptiveTemperature(rawScores, fieldSize) {
  const v = variance(rawScores);
  const std = Math.sqrt(v);
  // std 大 (signal 強) → T 大; std 細 → T 細
  // 基準 T: 9 馬=4.2, 12 馬=4.6
  const base = fieldSize <= 9 ? 4.2 : 4.6;
  // std 典型 0.02 - 0.06. 用 multiplier
  const mult = Math.max(0.85, Math.min(1.25, std / 0.04));
  return base * mult;
}

const races = resultsData.races.map((race) => {
  const runnersRaw = race.runners.map((r) => buildRunnerFeatures(r, race.meta)).filter(Boolean);
  const withFeats = buildFeatures(runnersRaw, race.meta);
  const baselines = Object.fromEntries(FK.map(k => [k, mean(withFeats.map(r => r.features?.[k] ?? 0.5))]));
  const proRaw = withFeats.map((r) => professionalRawScore(r, baselines));
  const v6Raw = withFeats.map((r) => v6RawScore(r, baselines));
  const fieldSize = withFeats.length;
  const Tpro = fieldSize <= 9 ? 4.2 : 4.6;
  const Tv6 = adaptiveTemperature(v6Raw, fieldSize);
  const proProb = softmaxProb(proRaw, Tpro);
  const v6Prob = softmaxProb(v6Raw, Tv6);
  const rows = withFeats.map((r, i) => ({ ...r, proProb: proProb[i], v6Prob: v6Prob[i] }));
  const proRanked = [...rows].sort((a, b) => b.proProb - a.proProb);
  const v6Ranked = [...rows].sort((a, b) => b.v6Prob - a.v6Prob);
  const actualTop3 = [...race.runners].filter(x => /^\d+$/.test(x.plc)).sort((a, b) => +a.plc - +b.plc).slice(0, 3).map(x => x.no);

  return {
    raceNo: race.raceNo,
    meta: race.meta,
    actualTop3,
    proTop4: proRanked.slice(0, 4).map(x => x.no),
    v6Top4: v6Ranked.slice(0, 4).map(x => x.no),
    v6Ranking: v6Ranked.map(r => ({ no: r.no, name: r.name, prob: +r.v6Prob.toFixed(2), plc: r.plc, winOdds: r.winOdds, rating: r.rating })),
    proRanking: proRanked.map(r => ({ no: r.no, name: r.name, prob: +r.proProb.toFixed(2), plc: r.plc, winOdds: r.winOdds })),
    v6Temp: Tv6,
  };
});

function hitStats(label, field) {
  let h = 0, c = 0;
  races.forEach(r => {
    if (r[field].some(n => r.actualTop3.includes(n))) h++;
    if (r[field].includes(r.actualTop3[0])) c++;
  });
  return { label, h, c, t: races.length };
}
const s1 = hitStats('Professional', 'proTop4');
const s2 = hitStats('V6', 'v6Top4');
console.log(`\n=== V6 Backtest ${DATE} ${VENUE} ${races.length} 場 ===`);
[s1, s2].forEach(s => console.log(`${s.label.padEnd(13)} Top4命中三 ${s.h}/${s.t} (${(s.h/s.t*100).toFixed(1)}%) | 命中冠 ${s.c}/${s.t} (${(s.c/s.t*100).toFixed(1)}%)`));

fs.writeFileSync(OUT, JSON.stringify({ date: DATE, venue: VENUE, races }, null, 2), 'utf8');
