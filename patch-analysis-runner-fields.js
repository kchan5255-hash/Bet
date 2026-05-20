const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const RACE_DATA_FILE = process.env.RACE_DATA_FILE || paths.miscPath('graphql-race-data.json');
const ANALYSIS_FILES = [
  'analysis-results.json',
  path.join('web', 'src', 'data', 'analysis-results.json'),
];

function readMeeting(file) {
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  const item = payload.find((entry) => entry.data?.data?.raceMeetings);
  if (!item) throw new Error(`No raceMeetings response in ${file}`);
  return item.data.data.raceMeetings[0];
}

function buildRunnerLookup(meeting) {
  const map = new Map();
  for (const race of meeting.races) {
    for (const runner of race.runners) {
      const key = `${race.no}-${runner.no}`;
      map.set(key, runner);
    }
  }
  return map;
}

function trimNumber(value) {
  const parsed = Number(String(value ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function patchFile(file, lookup) {
  if (!fs.existsSync(file)) {
    console.error(`skip ${file} (not found)`);
    return;
  }
  const races = JSON.parse(fs.readFileSync(file, 'utf8'));
  let patched = 0;
  for (const race of races) {
    for (const runner of race.runners) {
      const src = lookup.get(`${race.raceNo}-${runner.no}`);
      if (!src) continue;
      runner.gearInfo = (src.gearInfo || '').trim();
      runner.allowance = (src.allowance || '').trim();
      runner.trainerPreference = trimNumber(src.trainerPreference);
      runner.trumpCard = Boolean(src.trumpCard);
      runner.priority = Boolean(src.priority);
      patched++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(races, null, 2));
  console.log(`patched ${patched} runners in ${file}`);
}

const meeting = readMeeting(RACE_DATA_FILE);
const lookup = buildRunnerLookup(meeting);
ANALYSIS_FILES.forEach((file) => patchFile(file, lookup));
