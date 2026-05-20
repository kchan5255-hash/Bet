// build-race-results-by-date.js
// Aggregate data/results/<year>/results-full-*.json into
// web/src/data/race-results-by-date.json.
//
// Schema (matches existing file consumed by web/src/lib/results.ts):
//   {
//     dates:  [{ date, venue, venueName, raceCount }, ...],
//     byDate: { [date]: { date, venue, venueName, scrapedAt, races: [...] } }
//   }
//
// postTime / raceName are pulled from web/src/data/analysis-by-date.json
// when available, since the raw source files don't carry them.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const RESULTS_DIR = path.join(ROOT, 'data', 'results');
const ANALYSIS_FILE = path.join(ROOT, 'web', 'src', 'data', 'analysis-by-date.json');
const OUT = path.join(ROOT, 'web', 'src', 'data', 'race-results-by-date.json');

const VENUE_NAME = { ST: '沙田', HV: '跑馬地' };

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function listResultFiles() {
  const files = [];
  if (!fs.existsSync(RESULTS_DIR)) return files;
  for (const year of fs.readdirSync(RESULTS_DIR)) {
    const yearDir = path.join(RESULTS_DIR, year);
    if (!fs.statSync(yearDir).isDirectory()) continue;
    for (const name of fs.readdirSync(yearDir)) {
      const m = name.match(/^results-full-(\d{4}-\d{2}-\d{2})\.json$/);
      if (!m) continue;
      files.push({ date: m[1], path: path.join(yearDir, name) });
    }
  }
  files.sort((a, b) => a.date.localeCompare(b.date));
  return files;
}

function buildAnalysisIndex(analysis) {
  const map = new Map();
  for (const date of Object.keys(analysis.byDate || {})) {
    const races = analysis.byDate[date];
    if (!Array.isArray(races)) continue;
    const inner = new Map();
    for (const r of races) inner.set(r.raceNo, r);
    map.set(date, inner);
  }
  return map;
}

function pickTop4(runners) {
  return runners
    .filter((r) => /^\d+$/.test(String(r.plc)))
    .slice()
    .sort((a, b) => Number(a.plc) - Number(b.plc))
    .slice(0, 4)
    .map((r) => ({
      plc: String(r.plc),
      no: String(r.no),
      name: r.name,
      code: r.code,
      jockey: r.jockey,
      trainer: r.trainer,
      draw: Number(r.draw) || 0,
    }));
}

function normalizeRunners(runners) {
  return runners.map((r) => ({
    plc: String(r.plc ?? ''),
    no: String(r.no ?? ''),
    name: r.name ?? '',
    code: r.code ?? '',
    jockey: r.jockey ?? '',
    trainer: r.trainer ?? '',
    draw: Number(r.draw) || 0,
    lbw: r.lbw ?? '',
    finishTime: r.finishTime ?? '',
  }));
}

function build() {
  const files = listResultFiles();
  const analysis = fs.existsSync(ANALYSIS_FILE) ? readJson(ANALYSIS_FILE) : { byDate: {} };
  const analysisIndex = buildAnalysisIndex(analysis);

  const dates = [];
  const byDate = {};

  for (const { date, path: file } of files) {
    const data = readJson(file);
    const venue = data.venue || '';
    const analysisRaces = analysisIndex.get(date) || new Map();

    const races = (data.races || []).map((race) => {
      const meta = race.meta || {};
      const a = analysisRaces.get(race.raceNo);
      const runners = normalizeRunners(race.runners || []);
      return {
        raceNo: race.raceNo,
        titleBlock: meta.titleBlock || (a && a.titleBlock) || `第 ${race.raceNo} 場`,
        raceName: (a && a.raceName) || meta.raceName || `第 ${race.raceNo} 場`,
        className: meta.className || (a && a.className) || '',
        distance: Number(meta.distance) || (a && a.distance) || 0,
        going: meta.going || (a && a.going) || '',
        course: meta.course || (a && a.course) || '',
        postTime: (a && a.postTime) || '',
        top4: pickTop4(race.runners || []),
        runners,
      };
    });

    const entry = {
      date,
      venue,
      venueName: VENUE_NAME[venue] || venue,
      scrapedAt: data.scrapedAt || '',
      races,
    };

    byDate[date] = entry;
    dates.push({ date, venue, venueName: entry.venueName, raceCount: races.length });
  }

  const out = { dates, byDate };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

  console.log(`Wrote ${path.relative(ROOT, OUT)}`);
  console.log(`  ${dates.length} meetings, ${dates[0]?.date} → ${dates[dates.length - 1]?.date}`);
}

build();
