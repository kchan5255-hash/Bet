// features-pro.js
// Pro 14-feature 計算 + Original/Professional raw score + softmax
// advanced-analysis.js / backtest.js 共用,公式以 advanced 為準
// 對齊 web/src/lib/professional-model.ts 嘅 applyProfessionalModel

'use strict';

const FEATURE_KEYS = [
  'recent', 'form', 'courseDistance', 'course', 'distance',
  'class', 'going', 'rating', 'draw', 'weight', 'freshness',
  'body', 'career', 'age',
];

// ===== 基礎 helpers =====
function numberValue(v) {
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function parsePlace(v) {
  const n = parseInt(String(v || '').replace(/^0+/, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function parseDateDMY(v) {
  const m = String(v || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[3]) + 2000, Number(m[2]) - 1, Number(m[1])));
}

function parseCareerStats(v) {
  const m = String(v || '').match(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/);
  if (!m) return { wins: 0, seconds: 0, thirds: 0, starts: 0 };
  return { wins: +m[1], seconds: +m[2], thirds: +m[3], starts: +m[4] };
}

function normalize01(v, min, max) {
  if (!Number.isFinite(v) || min === max) return 0.5;
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

function clamp01(v) {
  if (!Number.isFinite(v)) return 0.5;
  return Math.max(0, Math.min(1, v));
}

// ===== Score helpers(advanced 為準) =====
function placeScore(p) {
  if (!p) return 0.25;
  if (p === 1) return 1;
  if (p === 2) return 0.82;
  if (p === 3) return 0.68;
  if (p <= 5) return 0.5;
  if (p <= 8) return 0.32;
  return 0.16;
}

function historicalOddsScore(odds) {
  const d = numberValue(odds);
  if (!d) return 0.5;
  return Math.max(0.15, Math.min(1, 1 / Math.sqrt(d / 3)));
}

function beatenDistanceScore(distance) {
  const v = String(distance || '').trim();
  if (!v) return 0.5;
  if (['N', 'SH', 'HD'].includes(v)) return 0.9;
  if (/^\d+$/.test(v)) return Math.max(0.25, 0.75 - Number(v) * 0.08);
  let total = 0;
  for (const part of v.split('-')) {
    if (/^\d+\/\d+$/.test(part)) {
      const [a, b] = part.split('/').map(Number);
      total += a / b;
    } else if (/^\d+$/.test(part)) {
      total += Number(part);
    }
  }
  if (!total) return 0.5;
  if (total <= 1) return 0.75;
  if (total <= 2) return 0.62;
  if (total <= 4) return 0.45;
  return 0.3;
}

function recordScore(r) {
  return (
    0.74 * placeScore(parsePlace(r.place)) +
    0.18 * historicalOddsScore(r.odds) +
    0.08 * beatenDistanceScore(r.lbw)
  );
}

function weightedAverage(values, weights) {
  let s = 0, w = 0;
  values.forEach((v, i) => {
    if (Number.isFinite(v)) {
      const wt = weights[i] ?? 1;
      s += v * wt;
      w += wt;
    }
  });
  return w ? s / w : 0.5;
}

function averageRecords(records, predicate, limit = 99) {
  const items = records
    .filter(predicate)
    .slice(0, limit)
    .map((r, i) => ({ value: recordScore(r), weight: Math.pow(0.92, i) }));
  const s = items.reduce((t, x) => t + x.value * x.weight, 0);
  const w = items.reduce((t, x) => t + x.weight, 0);
  return w ? s / w : 0.5;
}

function recentFormScore(last6run) {
  const values = String(last6run || '')
    .split('/')
    .map((v) => parseInt(v, 10))
    .filter(Number.isFinite)
    .map(placeScore);
  return weightedAverage(values, [1.8, 1.45, 1.15, 0.9, 0.7, 0.55]);
}

function drawScore(venue, distance, draw) {
  const dist = numberValue(distance);
  const d = numberValue(draw);
  if (!d) return 0.5;
  if (venue === 'HV' && dist === 1650) {
    if (d <= 3) return 1;
    if (d <= 5) return 0.84;
    if (d <= 8) return 0.58;
    if (d <= 10) return 0.34;
    return 0.18;
  }
  if (venue === 'HV' && dist === 1200) {
    if (d <= 3) return 0.92;
    if (d <= 6) return 0.82;
    if (d <= 8) return 0.62;
    if (d <= 10) return 0.4;
    return 0.24;
  }
  if (venue === 'HV' && dist === 1800) {
    if (d <= 3) return 0.95;
    if (d <= 6) return 0.76;
    if (d <= 8) return 0.52;
    return 0.3;
  }
  if (d <= 4) return 0.78;
  if (d <= 8) return 0.62;
  return 0.45;
}

function daysSinceLastRun(records, raceDate) {
  const latest = parseDateDMY(records[0]?.date);
  if (!latest) return null;
  return Math.round((raceDate - latest) / 86400000);
}

function fitnessScore(days) {
  if (days == null) return 0.55;
  if (days < 7) return 0.45;
  if (days <= 35) return 0.85;
  if (days <= 70) return 0.7;
  if (days <= 120) return 0.52;
  return 0.35;
}

function bodyWeightScore(current, records) {
  const rw = records.slice(0, 3).map((r) => numberValue(r.bodyWeight)).filter(Boolean);
  if (!current || !rw.length) return 0.55;
  const avg = rw.reduce((a, b) => a + b, 0) / rw.length;
  const diff = Math.abs(current - avg) / avg;
  if (diff <= 0.01) return 0.82;
  if (diff <= 0.025) return 0.7;
  if (diff <= 0.04) return 0.52;
  return 0.35;
}

function sameGoing(record, raceGoing) {
  const r = String(record.going || '');
  const txt = String(raceGoing || '');
  if (/好|Good/i.test(txt)) return ['G', 'GF', 'GY'].includes(r);
  return true;
}

// ===== buildFeatures — advanced-analysis.js 嘅 14 feature 公式 =====
// runners: [{ no, code, draw, handicapWeight, bodyWeight, rating, last6run,
//             age, careerStats, records, ... }]
// raceMeta: { venue, distance, classNo, going }
// 注意:caller 自行決定餵咩 records 入嚟(walk-forward cutoff 由 caller 處理)
function buildFeatures(runners, raceMeta) {
  const { venue, distance, classNo, going } = raceMeta;
  const dist = numberValue(distance);
  const raceDate = raceMeta.raceDate instanceof Date
    ? raceMeta.raceDate
    : (raceMeta.raceDate ? new Date(raceMeta.raceDate) : new Date());

  const ratings = runners.map((r) => numberValue(r.rating));
  const weights = runners.map((r) => numberValue(r.handicapWeight));
  const minR = Math.min(...ratings);
  const maxR = Math.max(...ratings);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);

  return runners.map((runner) => {
    const records = runner.records || [];
    const days = daysSinceLastRun(records, raceDate);
    const career = parseCareerStats(runner.careerStats);
    const winRate = career.starts ? career.wins / career.starts : 0;
    const placeRate = career.starts
      ? (career.wins + career.seconds + career.thirds) / career.starts
      : 0;

    const ageNum = (() => {
      const txt = String(runner.age || '');
      const slashTail = txt.split('/').pop();
      return numberValue(slashTail);
    })();

    const features = {
      recent: averageRecords(records, () => true, 6),
      form: recentFormScore(runner.last6run),
      courseDistance: averageRecords(
        records,
        (r) => String(r.track || '').includes(venue) &&
               Math.abs(numberValue(r.distance) - dist) <= 100,
        10,
      ),
      course: averageRecords(records, (r) => String(r.track || '').includes(venue), 12),
      distance: averageRecords(
        records,
        (r) => Math.abs(numberValue(r.distance) - dist) <= 100,
        12,
      ),
      class: averageRecords(records, (r) => numberValue(r.classNo) === classNo, 12),
      going: averageRecords(records, (r) => sameGoing(r, going), 12),
      rating: normalize01(numberValue(runner.rating), minR, maxR),
      draw: drawScore(venue, dist, runner.draw),
      weight: 1 - normalize01(numberValue(runner.handicapWeight), minW, maxW),
      freshness: fitnessScore(days),
      body: bodyWeightScore(numberValue(runner.bodyWeight), records),
      career: career.starts
        ? Math.max(0.15, Math.min(0.95, 0.35 + winRate * 1.25 + placeRate * 0.42))
        : 0.35,
      age: ageNum
        ? (ageNum <= 3 ? 0.62 : ageNum <= 6 ? 0.72 : ageNum <= 8 ? 0.6 : 0.45)
        : 0.55,
    };

    return {
      ...runner,
      features,
      daysSinceLastRun: days,
      recordsCount: records.length,
    };
  });
}

// ===== Original V1 raw score(advanced 加權版) =====
function originalRawScore(f) {
  return (
    0.18 * f.recent +
    0.11 * f.form +
    0.13 * f.courseDistance +
    0.07 * f.course +
    0.08 * f.distance +
    0.07 * f.class +
    0.05 * f.going +
    0.10 * f.rating +
    0.09 * f.draw +
    0.05 * f.weight +
    0.03 * f.freshness +
    0.02 * f.body +
    0.01 * f.career +
    0.01 * f.age
  );
}

// ===== Professional shrink + raw score(對齊 web/.../professional-model.ts) =====
function mean(vs) {
  const f = vs.filter(Number.isFinite);
  return f.length ? f.reduce((a, b) => a + b, 0) / f.length : 0.5;
}

function shrink(v, baseline, n, k) {
  const nn = Math.max(0, Number(n) || 0);
  const kk = Math.max(0, Number(k) || 0);
  if (nn + kk === 0) return clamp01(v);
  return clamp01((nn * v + kk * baseline) / (nn + kk));
}

function professionalRawScore(runner, baselines) {
  const f = runner.features;
  const rc = numberValue(runner.recordsCount);
  const careerStarts = parseCareerStats(runner.careerStats).starts;
  const vetPenalty = runner.veterinary?.risk || 0;

  const a = {
    recent: shrink(f.recent, baselines.recent, Math.min(rc, 8), 4),
    form: clamp01(f.form),
    courseDistance: shrink(f.courseDistance, baselines.courseDistance, Math.min(rc, 6), 8),
    course: shrink(f.course, baselines.course, Math.min(rc, 10), 8),
    distance: shrink(f.distance, baselines.distance, Math.min(rc, 10), 8),
    class: shrink(f.class, baselines.class, Math.min(rc, 10), 10),
    going: shrink(f.going, baselines.going, Math.min(rc, 10), 10),
    rating: clamp01(f.rating),
    draw: clamp01(f.draw),
    weight: clamp01(f.weight),
    freshness: clamp01(f.freshness),
    body: clamp01(f.body),
    career: shrink(f.career, baselines.career, Math.min(careerStarts || rc, 30), 18),
    age: clamp01(f.age),
  };

  const baseAbility = 0.34 * a.recent + 0.22 * a.form + 0.23 * a.rating + 0.14 * a.career + 0.07 * a.age;
  const suitability = 0.34 * a.courseDistance + 0.17 * a.course + 0.18 * a.distance + 0.17 * a.class + 0.14 * a.going;
  const raceSetup = 0.58 * a.draw + 0.30 * a.weight + 0.12 * a.freshness;
  const condition = 0.68 * a.body + 0.32 * a.freshness;

  return 0.4 * baseAbility + 0.3 * suitability + 0.2 * raceSetup + 0.1 * condition - vetPenalty * 1.12;
}

function applyProfessional(runners) {
  const baselines = Object.fromEntries(
    FEATURE_KEYS.map((k) => [k, mean(runners.map((r) => r.features?.[k] ?? 0.5))]),
  );
  return runners.map((r) => ({ ...r, proRawScore: professionalRawScore(r, baselines) }));
}

// ===== Softmax(mode 'orig' / 'pro') =====
function softmaxProb(rawScores, fieldSize, mode) {
  const T = mode === 'pro'
    ? (fieldSize <= 9 ? 4.2 : 4.6)
    : (fieldSize <= 9 ? 4.4 : 4.8);
  const ex = rawScores.map((s) => Math.exp(T * s));
  const sum = ex.reduce((a, b) => a + b, 0);
  return ex.map((e) => (e / sum) * 100);
}

module.exports = {
  FEATURE_KEYS,
  numberValue,
  parsePlace,
  parseDateDMY,
  parseCareerStats,
  normalize01,
  clamp01,
  placeScore,
  historicalOddsScore,
  beatenDistanceScore,
  recordScore,
  weightedAverage,
  averageRecords,
  recentFormScore,
  drawScore,
  daysSinceLastRun,
  fitnessScore,
  bodyWeightScore,
  sameGoing,
  buildFeatures,
  originalRawScore,
  applyProfessional,
  professionalRawScore,
  softmaxProb,
};

