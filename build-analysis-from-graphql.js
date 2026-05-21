// build-analysis-from-graphql.js
// Generate web/src/data/analysis-{date}.json from:
//   data/misc/graphql-race-data.json  (racecard with gearInfo, last6run, etc.)
//   data/horses/horses-all.json       (horse records for feature calculation)
//
// Then rebuilds analysis-by-date.json via build-multi-date-analysis.js logic.
//
// Usage:
//   node build-analysis-from-graphql.js
//   node build-analysis-from-graphql.js --no-rebuild   (skip analysis-by-date rebuild)

const fs = require('fs');
const path = require('path');
const F = require('./features-pro');
const { loadHorsesByCodes } = require('./supabase-data');

const ROOT = __dirname;
const GRAPHQL_FILE = path.join(ROOT, 'data', 'misc', 'graphql-race-data.json');
const HORSES_DIR = path.join(ROOT, 'data', 'horses');
const WEB_DATA_DIR = path.join(ROOT, 'web', 'src', 'data');

const NO_REBUILD = process.argv.includes('--no-rebuild');
const USE_SUPABASE = process.argv.includes('--supabase') || process.env.USE_SUPABASE === '1';

// ── helpers ──────────────────────────────────────────────────────────────────

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function numberValue(v) {
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// ── load graphql meeting ──────────────────────────────────────────────────────

function loadMeeting() {
  const payload = readJson(GRAPHQL_FILE);
  const item = payload.find((e) => e.data?.data?.raceMeetings);
  if (!item) throw new Error('No raceMeetings in graphql-race-data.json');
  return item.data.data.raceMeetings[0];
}

// ── load horses (Supabase 模式優先；fallback 到本地 horses-*.json) ────────────

function declaredCodesFromMeeting(meeting) {
  const codes = new Set();
  for (const race of meeting.races || []) {
    for (const r of race.runners || []) {
      if (r.status === 'Declared' && r.horse?.code) codes.add(r.horse.code);
    }
  }
  return [...codes];
}

function loadHorsesLocal() {
  const files = fs.readdirSync(HORSES_DIR)
    .filter((f) => f.endsWith('.json') && f.startsWith('horses'))
    .map((f) => ({ name: f, path: path.join(HORSES_DIR, f) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const map = new Map();
  for (const { path: p } of files) {
    const data = readJson(p);
    const horses = data.horses ?? (Array.isArray(data) ? data : []);
    for (const h of horses) {
      if (h.code) map.set(h.code, h);
    }
  }
  return map;
}

async function loadHorses(meeting) {
  if (USE_SUPABASE) {
    const codes = declaredCodesFromMeeting(meeting);
    console.log(`Loading ${codes.length} horses from Supabase...`);
    return loadHorsesByCodes(codes);
  }
  return loadHorsesLocal();
}

// ── build runners from graphql race ──────────────────────────────────────────

function declaredRunners(race) {
  return (race.runners || [])
    .filter((r) => r.status === 'Declared' && r.no)
    .map((r) => ({
      no: r.no,
      name: r.name_ch || r.name_en || '',
      englishName: r.name_en || '',
      code: r.horse?.code || '',
      draw: numberValue(r.barrierDrawNumber),
      handicapWeight: numberValue(r.handicapWeight),
      bodyWeight: numberValue(r.currentWeight),
      rating: numberValue(r.currentRating),
      last6run: (r.last6run || '').trim(),
      jockey: (r.jockey?.name_ch || '').trim(),
      trainer: (r.trainer?.name_ch || '').trim(),
      gearInfo: (r.gearInfo || '').trim(),
      allowance: (r.allowance || '').trim(),
      trainerPreference: numberValue(r.trainerPreference),
      trumpCard: Boolean(r.trumpCard),
      priority: Boolean(r.priority),
      winOdds: null,
      placeOdds: null,
    }));
}

// ── enrich runners with horse profile + records ───────────────────────────────

function enrichRunners(runners, horsesMap) {
  return runners.map((runner) => {
    const horse = horsesMap.get(runner.code) || { profile: {}, records: [] };
    const profile = horse.profile || {};
    const ageText = profile['Country of Origin / Age'] || '';
    const colorSex = profile['Colour / Sex'] || profile['Color / Sex'] || '';
    const sexRaw = (colorSex.split('/').pop() || '').trim().toLowerCase();
    const sexMap = {
      gelding: 'g', horse: 'h', colt: 'c', stallion: 's',
      mare: 'm', filly: 'f', rig: 'r',
    };
    const sex = sexMap[sexRaw] || sexRaw;
    const careerStats = profile['No. of 1-2-3-Starts*'] || '';
    const records = horse.records || [];
    return { ...runner, age: ageText, sex, careerStats, records };
  });
}

// ── score a race ──────────────────────────────────────────────────────────────

function raceClassNo(classStr) {
  const m = String(classStr || '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function scoreRace(race, horsesMap) {
  const runners = declaredRunners(race);
  const enriched = enrichRunners(runners, horsesMap);

  const venue = race._venue || 'HV';
  const dist = numberValue(race.distance);
  const classNo = raceClassNo(race.raceClass_en || race.raceClass_ch || '');
  const going = race.go_en || race.go_ch || '';
  const raceDate = new Date(race.postTime);

  const withFeatures = F.buildFeatures(enriched, { venue, distance: dist, classNo, going, raceDate });

  const FEATURE_KEYS = F.FEATURE_KEYS;
  const baselines = Object.fromEntries(
    FEATURE_KEYS.map((k) => [k, F.mean ? F.mean(withFeatures.map((r) => r.features?.[k] ?? 0.5)) : 0.5]),
  );

  // compute pro raw scores
  const proScores = withFeatures.map((r) => F.professionalRawScore(r, baselines));
  const fieldSize = withFeatures.length;
  const T = fieldSize <= 9 ? 4.2 : 4.6;
  const exps = proScores.map((s) => Math.exp(T * s));
  const sum = exps.reduce((a, b) => a + b, 0);

  const positiveFlags = (f) => {
    const p = [];
    if (f.recent >= 0.6) p.push('recent-form');
    if (f.courseDistance >= 0.6) p.push('course-distance');
    if (f.rating >= 0.75) p.push('rating-edge');
    if (f.draw >= 0.82) p.push('draw-edge');
    if (f.weight >= 0.75) p.push('light-weight');
    if (f.freshness >= 0.8) p.push('freshness');
    if (f.body >= 0.75) p.push('stable-body-weight');
    return p;
  };
  const negativeFlags = (f) => {
    const n = [];
    if (f.recent < 0.4) n.push('weak-recent-form');
    if (f.courseDistance < 0.42) n.push('unproven-course-distance');
    if (f.rating <= 0.2) n.push('low-rating');
    if (f.draw <= 0.4) n.push('wide-or-bad-draw');
    if (f.weight <= 0.15) n.push('heavy-weight');
    return n;
  };

  return withFeatures.map((r, i) => {
    const { records, ...rest } = r;
    return {
      ...rest,
      rawScore: proScores[i],
      modelProbability: (exps[i] / sum) * 100,
      positives: positiveFlags(r.features),
      negatives: negativeFlags(r.features),
    };
  }).sort((a, b) => Number(a.no) - Number(b.no));
}

// ── main ──────────────────────────────────────────────────────────────────────

function main() {
  const meeting = loadMeeting();
  return loadHorses(meeting).then((horsesMap) => mainWithHorses(meeting, horsesMap));
}

function mainWithHorses(meeting, horsesMap) {

  const date = meeting.date;
  const venue = meeting.venueCode || '';
  console.log(`Meeting: ${date} ${venue} (${meeting.races?.length} races)`);

  const results = (meeting.races || []).map((race) => {
    race._venue = venue;
    const runners = scoreRace(race, horsesMap);
    return {
      raceNo: race.no,
      raceName: race.raceName_ch || `第 ${race.no} 場`,
      distance: numberValue(race.distance),
      className: race.raceClass_ch || '',
      going: race.go_ch || race.go_en || '',
      course: (race.raceCourse?.description_ch ? `草地 - ${race.raceCourse.description_ch}` : race.raceCourse?.description_ch) || '',
      postTime: race.postTime || '',
      runners,
    };
  });

  const outFile = path.join(WEB_DATA_DIR, `analysis-${date}.json`);
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`Wrote ${path.relative(ROOT, outFile)} (${results.length} races)`);

  // sample check
  const sample = results[0]?.runners?.[0];
  if (sample) {
    console.log(`  Sample runner: ${sample.no} ${sample.name}`);
    console.log(`    last6run: ${sample.last6run}`);
    console.log(`    rating: ${sample.rating}`);
    console.log(`    gearInfo: ${sample.gearInfo}`);
    console.log(`    trumpCard: ${sample.trumpCard}`);
    console.log(`    trainerPreference: ${sample.trainerPreference}`);
  }

  if (!NO_REBUILD) {
    console.log('\nRebuilding analysis-by-date.json...');
    const { execSync } = require('child_process');
    // get all dates currently in analysis-by-date.json
    const byDateFile = path.join(WEB_DATA_DIR, 'analysis-by-date.json');
    const existing = readJson(byDateFile);
    const dates = existing.dates.map((d) => d.date);
    if (!dates.includes(date)) dates.push(date);
    dates.sort();
    execSync(`node build-multi-date-analysis.js ${dates.join(' ')}`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
