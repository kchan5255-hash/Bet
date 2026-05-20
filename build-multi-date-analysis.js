// build-multi-date-analysis.js
// 從多個日期的 V9 backtest 拼出 web/src/data/analysis-by-date.json，
// 讓 web 端的「勝率預測」頁可在多個賽馬日之間切換。
//
// 對於 advanced-analysis.js 跑過的日期（features 為原版 14-feature），
// 直接讀備份檔 web/src/data/analysis-{date}.json。
// 其他日期沒有 advanced-analysis 輸出，則從 V9 backtest 反推 14-feature（近似）。
//
// 輸出：
//   {
//     dates: [{date, venue, weekday, raceCount}, ...],
//     byDate: { "2026-05-13": Race[], ... }
//   }

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const DATES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['2026-05-03', '2026-05-09', '2026-05-13', '2026-05-17'];

const WEB_DATA_DIR = path.join(__dirname, 'web', 'src', 'data');

function advancedFileFor(date) {
  return path.join(WEB_DATA_DIR, `analysis-${date}.json`);
}

const WEEKDAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

function weekdayOf(date) {
  return WEEKDAY_LABELS[new Date(`${date}T00:00:00+08:00`).getDay()];
}

function pickFeature(f, ...keys) {
  for (const k of keys) {
    const v = f?.[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return 0.5;
}

function mapV9FeaturesTo14(v9Features) {
  return {
    recent: pickFeature(v9Features, 'recent'),
    form: pickFeature(v9Features, 'closing', 'recent'),
    courseDistance: pickFeature(v9Features, 'courseDistance'),
    course: pickFeature(v9Features, 'course'),
    distance: pickFeature(v9Features, 'distance'),
    class: pickFeature(v9Features, 'class'),
    going: pickFeature(v9Features, 'going'),
    rating: pickFeature(v9Features, 'rating'),
    draw: pickFeature(v9Features, 'draw'),
    weight: pickFeature(v9Features, 'weight'),
    freshness: pickFeature(v9Features, 'freshness'),
    body: pickFeature(v9Features, 'body'),
    career: pickFeature(v9Features, 'career'),
    age: pickFeature(v9Features, 'age'),
  };
}

function detectPositives(features) {
  const positives = [];
  if (features.recent >= 0.6) positives.push('recent-form');
  if (features.courseDistance >= 0.6) positives.push('course-distance');
  if (features.rating >= 0.75) positives.push('rating-edge');
  if (features.draw >= 0.82) positives.push('draw-edge');
  if (features.weight >= 0.75) positives.push('light-weight');
  if (features.freshness >= 0.8) positives.push('freshness');
  if (features.body >= 0.75) positives.push('stable-body-weight');
  return positives;
}

function detectNegatives(features) {
  const negatives = [];
  if (features.recent < 0.4) negatives.push('weak-recent-form');
  if (features.courseDistance < 0.42) negatives.push('unproven-course-distance');
  if (features.rating <= 0.2) negatives.push('low-rating');
  if (features.draw <= 0.4) negatives.push('wide-or-bad-draw');
  if (features.weight <= 0.15) negatives.push('heavy-weight');
  return negatives;
}

function postTimeFor(date, raceNo) {
  const startMinutes = 13 * 60;
  const t = startMinutes + raceNo * 35;
  const hh = String(Math.floor(t / 60)).padStart(2, '0');
  const mm = String(t % 60).padStart(2, '0');
  return `${date}T${hh}:${mm}:00+08:00`;
}

function convertRace(race) {
  const meta = race.meta || {};
  const runners = (race.v9Ranking || [])
    .map((r) => {
      const features = mapV9FeaturesTo14(r.features || {});
      return {
        no: String(r.no),
        name: r.name,
        englishName: '',
        code: r.code,
        draw: Number(r.draw) || 0,
        handicapWeight: Number(r.carriedWeight) || 0,
        bodyWeight: Number(r.bodyWeight) || 0,
        rating: Number(r.rating) || 0,
        last6run: '',
        jockey: r.displayJockey || r.jockey || '',
        trainer: r.displayTrainer || r.trainer || '',
        age: r.ageText || '',
        sex: r.sex || '',
        careerStats: r.careerStats || '',
        recordsCount: Number(r.records) || 0,
        daysSinceLastRun: r.daysSinceLastRun ?? null,
        features,
        rawScore: Number(r.score) || 0,
        modelProbability: Number(r.prob) || 0,
        positives: detectPositives(features),
        negatives: detectNegatives(features),
      };
    })
    .sort((a, b) => Number(a.no) - Number(b.no));

  return {
    raceNo: race.raceNo,
    raceName: meta.raceName || meta.titleBlock || `第 ${race.raceNo} 場`,
    distance: Number(meta.distance) || 0,
    className: meta.className || '',
    going: meta.going || '',
    course: meta.course || '',
    postTime: postTimeFor(race.date || '2026-01-01', race.raceNo),
    runners,
  };
}

function loadV9(date) {
  const file = paths.backtestPath('v9', date);
  if (!fs.existsSync(file)) {
    throw new Error(`V9 backtest not found for ${date}: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function venueName(code) {
  if (code === 'HV') return '跑馬地';
  if (code === 'ST') return '沙田';
  return code || '';
}

function loadAdvancedAnalysisRaces(date) {
  const file = advancedFileFor(date);
  if (!fs.existsSync(file)) return null;
  const races = JSON.parse(fs.readFileSync(file, 'utf8'));
  const sample = races[0]?.postTime?.slice(0, 10);
  if (sample && sample !== date) {
    console.warn(
      `WARN: ${file} is for ${sample}, not ${date}; falling back to V9-derived.`,
    );
    return null;
  }
  return races;
}

function main() {
  const dates = [];
  const byDate = {};
  for (const date of DATES) {
    const advanced = loadAdvancedAnalysisRaces(date);
    let races;
    let venue;
    if (advanced) {
      races = advanced;
      const v9 = loadV9(date);
      venue = v9.venue || '';
      console.log(`  ${date} → advanced-analysis (real Pro)`);
    } else {
      const v9 = loadV9(date);
      races = (v9.races || [])
        .map((race) => convertRace({ ...race, date }))
        .sort((a, b) => a.raceNo - b.raceNo);
      venue = v9.venue || '';
      console.log(`  ${date} → V9-derived (Pro approximation)`);
    }
    byDate[date] = races;
    dates.push({
      date,
      venue,
      venueName: venueName(venue),
      weekday: weekdayOf(date),
      raceCount: races.length,
    });
  }

  dates.sort((a, b) => a.date.localeCompare(b.date));
  const output = { dates, byDate };
  const outFile = path.join(WEB_DATA_DIR, 'analysis-by-date.json');
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nWrote ${dates.length} dates → ${outFile}`);
  for (const d of dates) console.log(`  ${d.date} ${d.weekday} ${d.venueName} (${d.raceCount} races)`);
}

main();
