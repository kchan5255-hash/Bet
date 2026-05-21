// model-v9.js
// Fresh scoring model: percentile-relative factors with reliability penalties.
//
// V9 is intentionally independent from V8's V6/V7 score blending. It reads the
// race result card and horse-history files, creates its own feature groups, then
// ranks runners by a field-relative score. V6/V7 are not inputs to the score.

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const DEFAULT_HORSE_FILES = [
  'horses-janmar.json',
  'horses-apr5days.json',
  'horses-3days.json',
  'horses-2026-05-09.json',
  'horses-513-missing.json',
];

const CORE_DISTANCES = [1200, 1400, 1650, 1800];
const POOL_QIN = '\u9023\u8d0f';
const FEATURE_KEYS = [
  'closing',
  'recent',
  'peak',
  'stability',
  'career',
  'rating',
  'courseDistance',
  'course',
  'distance',
  'distanceBand',
  'class',
  'going',
  'draw',
  'paceSetup',
  'weight',
  'freshness',
  'body',
  'jockey',
  'trainer',
  'age',
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return (min + max) / 2;
  return Math.max(min, Math.min(max, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function numberValue(value) {
  if (value == null) return null;
  const cleaned = String(value).replace(/[^0-9.\-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '--') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function valueOrZero(value) {
  const parsed = numberValue(value);
  return parsed == null ? 0 : parsed;
}

function mean(values, fallback = 0.5) {
  const finite = values.filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : fallback;
}

function variance(values) {
  const m = mean(values, 0);
  return mean(values.map((value) => (value - m) ** 2), 0);
}

function stdev(values) {
  return Math.sqrt(variance(values));
}

function parsePlace(value) {
  const parsed = parseInt(String(value || '').replace(/^0+/, ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateDMY(value) {
  const match = String(value || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[3]) + 2000, Number(match[2]) - 1, Number(match[1])));
}

function dateSortDesc(a, b) {
  const da = parseDateDMY(a.date);
  const db = parseDateDMY(b.date);
  return (db?.getTime() || 0) - (da?.getTime() || 0);
}

function targetDateDMY(date) {
  const parts = date.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
}

function recordKey(record) {
  return [
    record.date,
    record.track,
    record.distance,
    record.classNo,
    record.draw,
    record.jockey,
    record.trainer,
  ].join('|');
}

function mergeHorse(existing, incoming) {
  if (!existing) {
    return {
      ...incoming,
      records: [...(incoming.records || [])].sort(dateSortDesc),
    };
  }

  const recordsByKey = new Map();
  for (const record of existing.records || []) recordsByKey.set(recordKey(record), record);
  for (const record of incoming.records || []) recordsByKey.set(recordKey(record), record);

  const existingCount = existing.records?.length || 0;
  const incomingCount = incoming.records?.length || 0;
  const profile = incomingCount >= existingCount ? incoming.profile : existing.profile;
  return {
    ...existing,
    ...incoming,
    profile: profile || existing.profile || incoming.profile || {},
    records: [...recordsByKey.values()].sort(dateSortDesc),
  };
}

function loadHorseMap(horseFiles) {
  const horseByCode = new Map();
  for (const file of horseFiles) {
    if (!file || !fs.existsSync(file)) continue;
    const data = readJson(file);
    for (const horse of data.horses || []) {
      horseByCode.set(horse.code, mergeHorse(horseByCode.get(horse.code), horse));
    }
  }
  return horseByCode;
}

function existingDefaultHorseFiles(baseDir = process.cwd()) {
  return DEFAULT_HORSE_FILES
    .map((file) => paths.horsesPath(file))
    .filter((file) => fs.existsSync(file));
}

function placeScore(place) {
  if (!place) return 0.22;
  if (place === 1) return 1.00;
  if (place === 2) return 0.82;
  if (place === 3) return 0.69;
  if (place <= 5) return 0.52;
  if (place <= 8) return 0.34;
  return 0.17;
}

function historicalOddsScore(odds) {
  const decimal = numberValue(odds);
  if (!decimal) return 0.5;
  return clamp(1 / Math.sqrt(decimal / 3.2), 0.10, 1);
}

function parseBeatenDistance(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return null;
  if (raw === 'N' || raw === 'NOSE') return 0.05;
  if (raw === 'SH') return 0.12;
  if (raw === 'HD') return 0.20;

  let total = 0;
  let found = false;
  for (const part of raw.split('-')) {
    if (/^\d+\/\d+$/.test(part)) {
      const [a, b] = part.split('/').map(Number);
      if (b) {
        total += a / b;
        found = true;
      }
    } else if (/^\d+(\.\d+)?$/.test(part)) {
      total += Number(part);
      found = true;
    }
  }
  return found ? total : null;
}

function beatenDistanceScore(value) {
  const beaten = parseBeatenDistance(value);
  if (beaten == null) return 0.50;
  if (beaten <= 0.2) return 0.93;
  if (beaten <= 0.5) return 0.84;
  if (beaten <= 1) return 0.75;
  if (beaten <= 2) return 0.62;
  if (beaten <= 4) return 0.45;
  if (beaten <= 7) return 0.30;
  return 0.18;
}

function recordPerformance(record) {
  return clamp01(
    0.58 * placeScore(parsePlace(record.place))
    + 0.27 * beatenDistanceScore(record.lbw)
    + 0.15 * historicalOddsScore(record.odds),
  );
}

function weightedAverage(records, predicate, options = {}) {
  const limit = options.limit ?? 99;
  const decay = options.decay ?? 0.88;
  const scorer = options.scorer || recordPerformance;
  const selected = records.filter(predicate).slice(0, limit);
  let weightedSum = 0;
  let weightSum = 0;

  selected.forEach((record, index) => {
    const score = scorer(record);
    if (!Number.isFinite(score)) return;
    const weight = Math.pow(decay, index);
    weightedSum += score * weight;
    weightSum += weight;
  });

  return {
    score: weightSum ? weightedSum / weightSum : 0.5,
    count: selected.length,
  };
}

function raceClassNo(className) {
  const raw = String(className || '');
  if (/GRIFFIN/i.test(raw)) return 'GRIFFIN';
  const match = raw.match(/Class\s*(\d)|(\d)/i);
  if (match) return Number(match[1] || match[2]);
  return null;
}

function recordClassNo(classNo) {
  const raw = String(classNo || '').toUpperCase().trim();
  if (!raw) return null;
  if (raw === 'GRIFFIN') return 'GRIFFIN';
  if (raw === '4YO') return 3;
  const graded = raw.match(/^G\d/);
  if (graded) return 0;
  const numeric = raw.match(/^(\d)/);
  return numeric ? Number(numeric[1]) : null;
}

function classAdjustedPerformance(record, targetClass) {
  let score = recordPerformance(record);
  const sourceClass = recordClassNo(record.classNo);
  if (typeof targetClass === 'number' && typeof sourceClass === 'number') {
    score += clamp(targetClass - sourceClass, -2, 2) * 0.035;
  } else if (targetClass === 'GRIFFIN') {
    score += sourceClass === 'GRIFFIN' ? 0.035 : -0.025;
  }
  return clamp01(score);
}

function sameGoing(record, raceGoing) {
  const going = String(record.going || '').toUpperCase();
  const race = String(raceGoing || '').toUpperCase();
  if (race.includes('GOOD')) return ['GF', 'G', 'GY'].includes(going);
  if (race.includes('YIELD') || race.includes('SOFT')) return ['GY', 'Y', 'YS', 'S'].includes(going);
  return true;
}

function recentShape(records) {
  const recentScores = records.slice(0, 8).map(recordPerformance);
  const recent = weightedAverage(records, () => true, { limit: 6, decay: 0.80 }).score;
  const last2 = mean(recentScores.slice(0, 2), recent);
  const prev4 = mean(recentScores.slice(2, 6), recent);
  const closing = clamp01(0.5 + (last2 - prev4) * 1.18);
  const peak = recentScores.length ? Math.max(...recentScores.slice(0, 6)) : 0.5;
  const spread = recentScores.length >= 3 ? stdev(recentScores.slice(0, 6)) : 0.20;
  const stability = clamp01(1 - spread * 2.4);

  return {
    closing,
    recent,
    peak,
    stability,
    count: recentScores.length,
  };
}

function careerProfile(records) {
  let wins = 0;
  let places = 0;
  for (const record of records) {
    const place = parsePlace(record.place);
    if (place === 1) wins += 1;
    if (place && place <= 3) places += 1;
  }

  const starts = records.length;
  if (!starts) {
    return {
      score: 0.46,
      wins,
      places,
      starts,
    };
  }

  const winPosterior = (wins + 0.65) / (starts + 7);
  const placePosterior = (places + 2.2) / (starts + 9);
  const winScore = Math.log1p(winPosterior * 30) / Math.log(31);
  const placeRateScore = clamp01(placePosterior / 0.42);
  const experience = starts / (starts + 9);
  return {
    score: clamp01(0.48 * winScore + 0.34 * placeRateScore + 0.10 * experience + 0.08),
    wins,
    places,
    starts,
  };
}

function normalize01(value, min, max) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || min === max) return 0.5;
  return clamp01((value - min) / (max - min));
}

function daysSinceLastRun(records, raceDate) {
  const latest = parseDateDMY(records[0]?.date);
  if (!latest) return null;
  return Math.round((raceDate - latest) / 86400000);
}

function freshnessScore(days) {
  if (days == null) return 0.55;
  if (days < 7) return 0.38;
  if (days <= 24) return 0.80;
  if (days <= 49) return 0.89;
  if (days <= 75) return 0.70;
  if (days <= 120) return 0.52;
  return 0.32;
}

function bodyWeightScore(current, records) {
  const weights = records
    .slice(0, 5)
    .map((record) => numberValue(record.bodyWeight))
    .filter(Number.isFinite);
  if (!Number.isFinite(current) || !weights.length) return 0.55;
  const average = mean(weights, current);
  const diff = Math.abs(current - average) / average;
  if (diff <= 0.010) return 0.84;
  if (diff <= 0.023) return 0.72;
  if (diff <= 0.040) return 0.55;
  if (diff <= 0.060) return 0.38;
  return 0.24;
}

function ageScore(ageText) {
  const match = String(ageText || '').match(/\/\s*(\d+)/);
  const age = match ? Number(match[1]) : null;
  if (!age) return 0.58;
  if (age <= 2) return 0.62;
  if (age === 3) return 0.77;
  if (age <= 5) return 0.86;
  if (age <= 7) return 0.72;
  if (age <= 9) return 0.50;
  return 0.34;
}

function drawScore(venue, distance, draw, fieldSize) {
  if (!Number.isFinite(draw) || draw <= 0) return 0.5;
  const relative = fieldSize > 1 ? (draw - 1) / (fieldSize - 1) : 0.5;
  let base;

  if (venue === 'HV' && distance === 1650) {
    base = 1 - relative * 0.86;
  } else if (venue === 'HV' && distance === 1200) {
    base = 0.93 - relative * 0.70;
  } else if (venue === 'HV' && distance === 1800) {
    base = 0.90 - relative * 0.58;
  } else if (venue === 'ST' && distance === 1000) {
    base = relative <= 0.35 ? 0.58 + relative * 0.45 : 0.78 - Math.max(0, relative - 0.35) * 0.24;
  } else if (venue === 'ST' && distance <= 1400) {
    base = 0.82 - relative * 0.44;
  } else if (venue === 'ST' && distance >= 1600) {
    base = 0.76 - relative * 0.28;
  } else {
    base = 0.72 - relative * 0.30;
  }

  return clamp01(base);
}

function paceSetupScore(venue, distance, draw, fieldSize) {
  const drawBase = drawScore(venue, distance, draw, fieldSize);
  if (distance <= 1200) return clamp01(0.62 * drawBase + 0.38 * (fieldSize >= 12 ? 0.42 : 0.58));
  if (distance >= 1800) return clamp01(0.45 * drawBase + 0.55 * 0.58);
  return clamp01(0.55 * drawBase + 0.45 * 0.52);
}

function addStat(map, key, score, place) {
  if (!key) return;
  if (!map.has(key)) map.set(key, { starts: 0, wins: 0, places: 0, scoreSum: 0 });
  const row = map.get(key);
  row.starts += 1;
  row.scoreSum += score;
  if (place === 1) row.wins += 1;
  if (place && place <= 3) row.places += 1;
}

function buildConnectionStats(horseByCode, raceDate) {
  const jockey = new Map();
  const trainer = new Map();
  const allScores = [];

  for (const horse of horseByCode.values()) {
    for (const record of horse.records || []) {
      const recordDate = parseDateDMY(record.date);
      if (!recordDate || recordDate >= raceDate) continue;
      const score = recordPerformance(record);
      const place = parsePlace(record.place);
      allScores.push(score);
      addStat(jockey, record.jockey, score, place);
      addStat(trainer, record.trainer, score, place);
    }
  }

  return {
    jockey,
    trainer,
    baseline: mean(allScores, 0.5),
  };
}

function shrinkToBaseline(value, baseline, sampleSize, priorStrength) {
  const n = Math.max(0, Number(sampleSize) || 0);
  const k = Math.max(0, Number(priorStrength) || 0);
  const v = Number.isFinite(value) ? value : baseline;
  if (n + k === 0) return clamp01(v);
  return clamp01((n * v + k * baseline) / (n + k));
}

function connectionScore(map, key, baseline, priorStrength) {
  const row = map.get(key);
  if (!row || !row.starts) return { score: 0.5, starts: 0 };
  const avg = row.scoreSum / row.starts;
  const winRate = ((row.wins + 0.7) / (row.starts + 9)) * 5.8;
  const placeRate = ((row.places + 2.0) / (row.starts + 12)) * 2.9;
  const raw = 0.66 * avg + 0.18 * clamp01(winRate) + 0.16 * clamp01(placeRate);
  return {
    score: shrinkToBaseline(raw, baseline, Math.min(row.starts, 120), priorStrength),
    starts: row.starts,
  };
}

function buildRunnerBase(resultRunner, raceMeta, context) {
  const horse = context.horseByCode.get(resultRunner.code);
  if (!horse) return null;

  const raceDayRecord = (horse.records || []).find((record) => {
    if (record.date !== context.targetDMY) return false;
    const recordDistance = numberValue(record.distance);
    return !recordDistance || !raceMeta.distance || recordDistance === raceMeta.distance;
  });

  const history = (horse.records || [])
    .filter((record) => {
      const recordDate = parseDateDMY(record.date);
      return recordDate && recordDate < context.raceDate;
    })
    .sort(dateSortDesc);

  return {
    no: String(resultRunner.no),
    name: resultRunner.name,
    code: resultRunner.code,
    plc: resultRunner.plc,
    winOdds: valueOrZero(resultRunner.winOdds),
    draw: numberValue(raceDayRecord?.draw) ?? numberValue(resultRunner.draw),
    carriedWeight: numberValue(raceDayRecord?.actWt) ?? numberValue(resultRunner.actualWeight),
    bodyWeight: numberValue(raceDayRecord?.bodyWeight) ?? numberValue(resultRunner.bodyWeight),
    rating: numberValue(raceDayRecord?.rating),
    jockey: raceDayRecord?.jockey || resultRunner.jockey,
    trainer: raceDayRecord?.trainer || resultRunner.trainer,
    displayJockey: resultRunner.jockey,
    displayTrainer: resultRunner.trainer,
    ageText: (horse.profile?.['Country of Origin / Age'] || '').trim(),
    sex: String(horse.profile?.['Color / Sex'] || '').split('/').pop()?.trim() || '',
    careerStats: (horse.profile?.['No. of 1-2-3-Starts*'] || '').trim(),
    records: history,
  };
}

function buildRunnerFeatures(runners, raceMeta, context) {
  const venue = context.venue;
  const distance = raceMeta.distance;
  const classNo = raceClassNo(raceMeta.className);
  const fieldSize = runners.length;
  const ratings = runners.map((runner) => runner.rating).filter(Number.isFinite);
  const weights = runners.map((runner) => runner.carriedWeight).filter(Number.isFinite);
  const minRating = ratings.length ? Math.min(...ratings) : null;
  const maxRating = ratings.length ? Math.max(...ratings) : null;
  const minWeight = weights.length ? Math.min(...weights) : null;
  const maxWeight = weights.length ? Math.max(...weights) : null;

  return runners.map((runner) => {
    const records = runner.records || [];
    const recent = recentShape(records);
    const career = careerProfile(records);
    const days = daysSinceLastRun(records, context.raceDate);
    const jockey = connectionScore(context.connectionStats.jockey, runner.jockey, context.connectionStats.baseline, 26);
    const trainer = connectionScore(context.connectionStats.trainer, runner.trainer, context.connectionStats.baseline, 36);
    const courseDistance = weightedAverage(
      records,
      (record) => String(record.track || '').includes(venue) && numberValue(record.distance) === distance,
      { limit: 8 },
    );
    const course = weightedAverage(
      records,
      (record) => String(record.track || '').includes(venue),
      { limit: 12 },
    );
    const exactDistance = weightedAverage(
      records,
      (record) => numberValue(record.distance) === distance,
      { limit: 10 },
    );
    const distanceBand = weightedAverage(
      records,
      (record) => {
        const recordDistance = numberValue(record.distance);
        return Number.isFinite(recordDistance) && Math.abs(recordDistance - distance) <= 200;
      },
      { limit: 12 },
    );
    const classFit = weightedAverage(
      records,
      (record) => classNo == null || recordClassNo(record.classNo) != null,
      { limit: 12, scorer: (record) => classAdjustedPerformance(record, classNo) },
    );
    const going = weightedAverage(
      records,
      (record) => sameGoing(record, raceMeta.going),
      { limit: 10 },
    );

    const ratingScore = normalize01(runner.rating, minRating, maxRating);
    const weightNorm = normalize01(runner.carriedWeight, minWeight, maxWeight);
    const lighterWeight = Number.isFinite(runner.carriedWeight) ? 1 - weightNorm : 0.5;

    const features = {
      closing: recent.closing,
      recent: recent.recent,
      peak: recent.peak,
      stability: recent.stability,
      career: career.score,
      rating: ratingScore,
      courseDistance: courseDistance.score,
      course: course.score,
      distance: exactDistance.score,
      distanceBand: distanceBand.score,
      class: classFit.score,
      going: going.score,
      draw: drawScore(venue, distance, runner.draw, fieldSize),
      paceSetup: paceSetupScore(venue, distance, runner.draw, fieldSize),
      weight: clamp01(0.56 * lighterWeight + 0.44 * ratingScore),
      freshness: freshnessScore(days),
      body: bodyWeightScore(runner.bodyWeight, records),
      jockey: jockey.score,
      trainer: trainer.score,
      age: ageScore(runner.ageText),
    };

    const counts = {
      recent: recent.count,
      closing: recent.count,
      peak: recent.count,
      stability: recent.count,
      career: career.starts,
      courseDistance: courseDistance.count,
      course: course.count,
      distance: exactDistance.count,
      distanceBand: distanceBand.count,
      class: classFit.count,
      going: going.count,
      jockey: jockey.starts,
      trainer: trainer.starts,
    };

    const historyReliability = records.length / (records.length + 6);
    const specialistReliability = Math.max(courseDistance.count, exactDistance.count, classFit.count) / (
      Math.max(courseDistance.count, exactDistance.count, classFit.count) + 5
    );
    const connectionReliability = (jockey.starts + trainer.starts) / (jockey.starts + trainer.starts + 90);
    const dataReliability = clamp(
      0.24 + 0.42 * historyReliability + 0.20 * specialistReliability + 0.14 * connectionReliability,
      0.20,
      0.92,
    );

    return {
      ...runner,
      features,
      counts,
      career,
      daysSinceLastRun: days,
      recordsCount: records.length,
      dataReliability,
    };
  });
}

function percentileRank(value, values) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length || !Number.isFinite(value)) return 0.5;
  const lower = finite.filter((item) => item < value).length;
  const equal = finite.filter((item) => item === value).length;
  return (lower + 0.5 * equal) / finite.length;
}

function fieldRelativeFeatures(runners) {
  const byKey = Object.fromEntries(
    FEATURE_KEYS.map((key) => [key, runners.map((runner) => runner.features?.[key])]),
  );

  return runners.map((runner) => {
    const relative = {};
    for (const key of FEATURE_KEYS) {
      relative[key] = percentileRank(runner.features?.[key], byKey[key]);
    }
    return {
      ...runner,
      relative,
    };
  });
}

function scoreRunner(runner, raceMeta) {
  const r = runner.relative;
  const classNo = raceClassNo(raceMeta.className);

  const groups = {
    formCycle: 0.36 * r.recent + 0.25 * r.closing + 0.22 * r.peak + 0.17 * r.stability,
    provenAbility: 0.36 * r.career + 0.34 * r.rating + 0.18 * r.age + 0.12 * r.weight,
    suitability: 0.24 * r.courseDistance + 0.17 * r.course + 0.20 * r.distance + 0.12 * r.distanceBand + 0.16 * r.class + 0.11 * r.going,
    raceShape: 0.35 * r.draw + 0.25 * r.paceSetup + 0.20 * r.freshness + 0.20 * r.body,
    humanEdge: 0.58 * r.jockey + 0.42 * r.trainer,
  };

  let weights = {
    formCycle: 0.27,
    provenAbility: 0.27,
    suitability: 0.23,
    raceShape: 0.14,
    humanEdge: 0.09,
  };

  if (classNo === 'GRIFFIN' || runner.recordsCount <= 1) {
    weights = {
      formCycle: 0.12,
      provenAbility: 0.18,
      suitability: 0.15,
      raceShape: 0.27,
      humanEdge: 0.28,
    };
  } else if (raceMeta.distance <= 1200) {
    weights = {
      formCycle: 0.25,
      provenAbility: 0.24,
      suitability: 0.20,
      raceShape: 0.20,
      humanEdge: 0.11,
    };
  }

  const raw =
    weights.formCycle * groups.formCycle
    + weights.provenAbility * groups.provenAbility
    + weights.suitability * groups.suitability
    + weights.raceShape * groups.raceShape
    + weights.humanEdge * groups.humanEdge;

  const reliabilityPenalty = (1 - runner.dataReliability) * 0.040;
  const specialistBoost = Math.max(0, groups.suitability - 0.62) * 0.025;
  const shapeBoost = Math.max(0, groups.raceShape - 0.68) * 0.018;
  const finalScore = clamp01(raw - reliabilityPenalty + specialistBoost + shapeBoost);

  return {
    groups,
    groupWeights: weights,
    rawScore: raw,
    finalScore,
  };
}

function softmaxProbability(scores, temperature) {
  const maxScore = Math.max(...scores);
  const exponentials = scores.map((score) => Math.exp((score - maxScore) * temperature));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => (value / total) * 100);
}

function adaptiveTemperature(scores, fieldSize, meanReliability) {
  const spread = stdev(scores);
  const fieldBase = fieldSize <= 9 ? 4.8 : 5.45;
  const spreadMultiplier = clamp(spread / 0.18, 0.82, 1.28);
  const reliabilityMultiplier = clamp(meanReliability / 0.58, 0.86, 1.12);
  return fieldBase * spreadMultiplier * reliabilityMultiplier;
}

function topFactors(scored, groupBaselines) {
  return Object.entries(scored.groups)
    .map(([name, value]) => ({
      factor: name,
      impact: (value - groupBaselines[name]) * scored.groupWeights[name],
    }))
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 3)
    .map((item) => ({
      factor: item.factor,
      impact: Number(item.impact.toFixed(4)),
    }));
}

function summarizeRunner(runner, scored, probability, groupBaselines, rank) {
  return {
    rank,
    no: runner.no,
    name: runner.name,
    code: runner.code,
    prob: Number(probability.toFixed(2)),
    score: Number(scored.finalScore.toFixed(4)),
    reliability: Number(runner.dataReliability.toFixed(3)),
    records: runner.recordsCount,
    daysSinceLastRun: runner.daysSinceLastRun,
    plc: runner.plc,
    winOdds: runner.winOdds,
    rating: valueOrZero(runner.rating),
    draw: runner.draw,
    carriedWeight: valueOrZero(runner.carriedWeight),
    bodyWeight: valueOrZero(runner.bodyWeight),
    jockey: runner.jockey,
    trainer: runner.trainer,
    displayJockey: runner.displayJockey,
    displayTrainer: runner.displayTrainer,
    ageText: runner.ageText,
    sex: runner.sex,
    careerStats: runner.careerStats,
    features: Object.fromEntries(
      Object.entries(runner.features || {}).map(([key, value]) => [key, Number(value.toFixed(4))]),
    ),
    relative: Object.fromEntries(
      Object.entries(runner.relative || {}).map(([key, value]) => [key, Number(value.toFixed(4))]),
    ),
    counts: runner.counts || {},
    groupWeights: Object.fromEntries(
      Object.entries(scored.groupWeights || {}).map(([key, value]) => [key, Number(value.toFixed(4))]),
    ),
    groups: Object.fromEntries(
      Object.entries(scored.groups).map(([key, value]) => [key, Number(value.toFixed(4))]),
    ),
    topFactors: topFactors(scored, groupBaselines),
  };
}

function scoreRace(race, context) {
  const baseRunners = (race.runners || [])
    .map((runner) => buildRunnerBase(runner, race.meta, context))
    .filter(Boolean);
  const runners = fieldRelativeFeatures(buildRunnerFeatures(baseRunners, race.meta, context));
  const scoredRows = runners.map((runner) => ({ runner, scored: scoreRunner(runner, race.meta) }));
  const groupBaselines = {};

  for (const groupName of ['formCycle', 'provenAbility', 'suitability', 'raceShape', 'humanEdge']) {
    groupBaselines[groupName] = mean(scoredRows.map((row) => row.scored.groups[groupName]), 0.5);
  }

  const scores = scoredRows.map((row) => row.scored.finalScore);
  const temp = adaptiveTemperature(scores, scoredRows.length, mean(scoredRows.map((row) => row.runner.dataReliability), 0.5));
  const probabilities = softmaxProbability(scores, temp);
  const ranked = scoredRows
    .map((row, index) => ({
      ...row,
      probability: probabilities[index],
    }))
    .sort((a, b) => {
      if (b.probability !== a.probability) return b.probability - a.probability;
      return b.scored.finalScore - a.scored.finalScore;
    });

  const actualTop3 = [...(race.runners || [])]
    .filter((runner) => /^\d+$/.test(String(runner.plc)))
    .sort((a, b) => Number(a.plc) - Number(b.plc))
    .slice(0, 3)
    .map((runner) => String(runner.no));

  const ranking = ranked.map((row, index) => (
    summarizeRunner(row.runner, row.scored, row.probability, groupBaselines, index + 1)
  ));
  const signals = raceSignals(ranking, race.meta);

  return {
    raceNo: race.raceNo,
    meta: race.meta,
    actualTop3,
    v9Top4: ranking.slice(0, 4).map((runner) => runner.no),
    v9Ranking: ranking,
    v9Temp: Number(temp.toFixed(3)),
    fieldSize: ranking.length,
    signals,
    recommendations: buildRecommendations(ranking, race.meta, signals),
  };
}

function raceSignals(ranking, meta) {
  const top1 = ranking[0];
  const top2 = ranking[1];
  const top3 = ranking[2];
  const gap12 = (top1?.prob || 0) - (top2?.prob || 0);
  const gap23 = (top2?.prob || 0) - (top3?.prob || 0);
  const top2Reliability = mean([top1?.reliability, top2?.reliability], 0);
  const top2Suitability = mean([top1?.groups?.suitability, top2?.groups?.suitability], 0);
  const top1Shape = top1?.groups?.raceShape || 0;
  const fieldSize = ranking.length;
  const distance = meta?.distance;

  return {
    fieldSize,
    distance,
    className: meta?.className,
    coreDistance: CORE_DISTANCES.includes(distance),
    topGap: Number(gap12.toFixed(2)),
    secondGap: Number(gap23.toFixed(2)),
    top2Reliability: Number(top2Reliability.toFixed(3)),
    top2Suitability: Number(top2Suitability.toFixed(3)),
    top1Shape: Number(top1Shape.toFixed(3)),
    top1Prob: Number((top1?.prob || 0).toFixed(2)),
  };
}

function buildRecommendations(ranking, meta, signals) {
  const reasons = [];
  const riskFlags = [];

  if (signals.fieldSize >= 10) reasons.push('field>=10');
  else riskFlags.push('field<10');

  if (signals.coreDistance) reasons.push('core-distance');
  else riskFlags.push('non-core-distance');

  if (signals.topGap >= 0.25 && signals.topGap <= 4.25) reasons.push('top-gap-in-value-band');
  else riskFlags.push('top-gap-outside-value-band');

  if (signals.top2Reliability >= 0.45) reasons.push('top2-reliability>=0.45');
  else riskFlags.push('low-top2-reliability');

  if (signals.top2Suitability >= 0.50) reasons.push('top2-suitability>=field-median');
  else riskFlags.push('weak-top2-suitability');

  if (raceClassNo(meta?.className) === 'GRIFFIN') riskFlags.push('griffin-race');
  if (!ranking[1]) riskFlags.push('missing-top2');

  const play =
    signals.fieldSize >= 10
    && signals.coreDistance
    && signals.topGap >= 0.25
    && signals.topGap <= 4.25
    && signals.top2Reliability >= 0.45
    && signals.top2Suitability >= 0.50
    && ranking[1];

  const bets = [];
  if (play) {
    bets.push({
      id: 'v9-qinella-top12',
      pool: POOL_QIN,
      horses: [ranking[0].no, ranking[1].no],
      stake: 10,
      riskTier: signals.top2Reliability >= 0.58 && signals.top2Suitability >= 0.58 ? 'standard' : 'thin-edge',
      rationale: [
        'V9 percentile-relative score gate',
        ...reasons,
      ],
    });
  }

  return {
    action: bets.length ? 'play' : 'skip',
    bets,
    reasons,
    riskFlags,
  };
}

function summarizeBacktest(backtest) {
  const summary = {
    races: 0,
    top4Hit: 0,
    winnerTop4: 0,
    top1Win: 0,
    winnerRankSum: 0,
    logLossSum: 0,
    brierSum: 0,
  };

  for (const race of backtest.races || []) {
    if (!race.actualTop3?.length || !race.v9Ranking?.length) continue;
    const winner = race.actualTop3[0];
    summary.races += 1;
    if (race.v9Top4.some((no) => race.actualTop3.includes(no))) summary.top4Hit += 1;
    if (race.v9Top4.includes(winner)) summary.winnerTop4 += 1;
    if (race.v9Ranking[0]?.no === winner) summary.top1Win += 1;

    const winnerIndex = race.v9Ranking.findIndex((runner) => runner.no === winner);
    summary.winnerRankSum += winnerIndex >= 0 ? winnerIndex + 1 : race.v9Ranking.length + 1;
    const probs = race.v9Ranking.map((runner) => clamp(Number(runner.prob) || 0.0001, 0.0001, 99.9999) / 100);
    const winnerProb = winnerIndex >= 0 ? probs[winnerIndex] : 0.0001;
    summary.logLossSum += -Math.log(winnerProb);
    summary.brierSum += probs.reduce((sum, prob, index) => {
      const observed = race.v9Ranking[index].no === winner ? 1 : 0;
      return sum + (prob - observed) ** 2;
    }, 0);
  }

  return {
    races: summary.races,
    top4Hit: summary.top4Hit,
    top4HitRate: summary.races ? (summary.top4Hit / summary.races) * 100 : 0,
    winnerTop4: summary.winnerTop4,
    winnerTop4Rate: summary.races ? (summary.winnerTop4 / summary.races) * 100 : 0,
    top1Win: summary.top1Win,
    top1WinRate: summary.races ? (summary.top1Win / summary.races) * 100 : 0,
    avgWinnerRank: summary.races ? summary.winnerRankSum / summary.races : 0,
    logLoss: summary.races ? summary.logLossSum / summary.races : 0,
    brier: summary.races ? summary.brierSum / summary.races : 0,
  };
}

function runBacktest(options = {}) {
  const date = options.date || process.env.DATE || '2026-05-09';
  const PRE_RACE = process.env.PRE_RACE === '1' || options.preRace === true;
  let resultsFile = options.results || process.env.RESULTS;
  if (!resultsFile) {
    if (PRE_RACE && fs.existsSync(paths.resultsPreRacePath(date))) {
      resultsFile = paths.resultsPreRacePath(date);
    } else if (fs.existsSync(paths.resultsFullPath(date))) {
      resultsFile = paths.resultsFullPath(date);
    } else if (fs.existsSync(paths.resultsPreRacePath(date))) {
      resultsFile = paths.resultsPreRacePath(date);
    } else {
      throw new Error(`No results file for ${date}: tried ${paths.resultsFullPath(date)} and ${paths.resultsPreRacePath(date)}`);
    }
  }
  const horseFiles = options.horses
    || (process.env.HORSES
      ? process.env.HORSES.split(',').map((item) => paths.horsesPath(item.trim())).filter(Boolean)
      : existingDefaultHorseFiles());
  const outFile = options.out || process.env.OUT || paths.backtestWritePath('v9', date);
  const quiet = Boolean(options.quiet);

  if (!horseFiles.length) {
    throw new Error('No horse files found. Set HORSES=file1.json,file2.json or add the default horse files.');
  }

  const resultsData = readJson(resultsFile);
  const horseByCode = loadHorseMap(horseFiles);
  const raceDate = new Date(`${date}T00:00:00+08:00`);
  const context = {
    date,
    targetDMY: targetDateDMY(date),
    raceDate,
    venue: resultsData.venue,
    horseByCode,
    connectionStats: buildConnectionStats(horseByCode, raceDate),
  };

  const races = (resultsData.races || []).map((race) => scoreRace(race, context));
  const output = {
    date,
    venue: resultsData.venue,
    model: 'v9-percentile-reliability',
    horseFiles: horseFiles.map((file) => path.basename(file)),
    policy: {
      defaultStakeUnit: 10,
      coreDistances: CORE_DISTANCES,
      defaultRule: 'Play quinella on V9 top1-top2 when field>=10, core distance, top gap is 0.25-4.25, top2 reliability>=0.45, and top2 suitability>=0.50.',
    },
    races,
  };

  fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');

  const summary = summarizeBacktest(output);
  if (!quiet) {
    const plays = races.reduce((sum, race) => sum + (race.recommendations?.bets?.length || 0), 0);
    console.log(`\n=== V9 Backtest ${date} ${resultsData.venue} ${races.length} races ===`);
    console.log(`Top4 any placed: ${summary.top4Hit}/${summary.races} (${summary.top4HitRate.toFixed(1)}%)`);
    console.log(`Winner in Top4: ${summary.winnerTop4}/${summary.races} (${summary.winnerTop4Rate.toFixed(1)}%)`);
    console.log(`Top1 winner: ${summary.top1Win}/${summary.races} (${summary.top1WinRate.toFixed(1)}%)`);
    console.log(`Average winner rank: ${summary.avgWinnerRank.toFixed(2)}`);
    console.log(`Recommended bets: ${plays}`);
    console.log(`Written: ${outFile}`);
  }

  return output;
}

module.exports = {
  CORE_DISTANCES,
  DEFAULT_HORSE_FILES,
  existingDefaultHorseFiles,
  runBacktest,
  summarizeBacktest,
};

if (require.main === module) {
  runBacktest();
}
