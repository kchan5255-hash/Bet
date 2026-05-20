// build-dividends-by-date.js
// Aggregate data/dividends/<year>/dividends-*.json into
// web/src/data/dividends-by-date.json.
//
// Schema:
//   {
//     dates:  [{ date, venue, venueName, raceCount }, ...],
//     byDate: { [date]: { date, venue, venueName, scrapedAt, races: [...] } }
//   }
//
// Each race entry:
//   { raceNo, dividends: { 獨贏: [{combo, amount}], 位置: [...], ... } }

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIVIDENDS_DIR = path.join(ROOT, 'data', 'dividends');
const OUT = path.join(ROOT, 'web', 'src', 'data', 'dividends-by-date.json');

const VENUE_NAME = { ST: '沙田', HV: '跑馬地' };

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function listDividendFiles() {
  const files = [];
  if (!fs.existsSync(DIVIDENDS_DIR)) return files;
  for (const year of fs.readdirSync(DIVIDENDS_DIR)) {
    const yearDir = path.join(DIVIDENDS_DIR, year);
    if (!fs.statSync(yearDir).isDirectory()) continue;
    for (const name of fs.readdirSync(yearDir)) {
      const m = name.match(/^dividends-(\d{4}-\d{2}-\d{2})\.json$/);
      if (!m) continue;
      files.push({ date: m[1], path: path.join(yearDir, name) });
    }
  }
  files.sort((a, b) => a.date.localeCompare(b.date));
  return files;
}

function build() {
  const files = listDividendFiles();

  const dates = [];
  const byDate = {};

  for (const { date, path: file } of files) {
    const data = readJson(file);
    const venue = data.venue || '';

    const races = (data.races || []).map((race) => ({
      raceNo: race.raceNo,
      dividends: race.dividends || {},
    }));

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
