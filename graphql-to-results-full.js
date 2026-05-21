// graphql-to-results-full.js
// 把 graphql-race-data.json 轉為賽前的 results-full-{date}.json，
// 用來給 model-v9.js 賽前模式跑（plc/winOdds 留空）。
//
// 用法：
//   node graphql-to-results-full.js
//   IN=data/misc/graphql-race-data.json node graphql-to-results-full.js

const fs = require('fs');
const paths = require('./paths');

const IN = process.env.IN || paths.miscPath('graphql-race-data.json');
const PRE = process.argv.includes('--pre') || process.env.PRE === '1';

const data = JSON.parse(fs.readFileSync(IN, 'utf8'));
const meetingItem = data.find((x) => x.data?.data?.raceMeetings);
if (!meetingItem) {
  console.error(`未找到 raceMeetings：${IN}`);
  process.exit(1);
}

const meeting = meetingItem.data.data.raceMeetings[0];
const date = meeting.date;
const venue = meeting.venueCode;

function buildMeta(race) {
  const className = race.raceClass_ch || race.raceClass_en || '';
  const going = race.go_ch || race.go_en || '';
  const trackName = race.raceTrack?.description_ch || race.raceTrack?.description_en || '';
  const courseName = race.raceCourse?.description_ch || race.raceCourse?.description_en || '';
  const course = trackName && courseName ? `${trackName} - ${courseName}` : (trackName || courseName);
  return {
    titleBlock: `第 ${race.no} 場`,
    className,
    distance: Number(race.distance) || 0,
    going,
    course,
  };
}

function buildRunner(r) {
  return {
    plc: '',
    no: String(r.no),
    name: r.name_ch || r.name_en || '',
    code: r.horse?.code || r.id || '',
    jockey: r.jockey?.name_ch || r.jockey?.name_en || '',
    trainer: r.trainer?.name_ch || r.trainer?.name_en || '',
    actualWeight: r.handicapWeight ? Number(r.handicapWeight) : null,
    bodyWeight: r.currentWeight ? Number(r.currentWeight) : null,
    draw: Number(r.barrierDrawNumber) || 0,
    lbw: '',
    running: '',
    finishTime: '',
    winOdds: r.winOdds != null && r.winOdds !== '' ? Number(r.winOdds) : null,
    rating: r.currentRating ? Number(r.currentRating) : 0,
    last6run: r.last6run || '',
    handicapWeight: r.handicapWeight ? Number(r.handicapWeight) : null,
    gearInfo: r.gearInfo || '',
    allowance: (r.allowance || '').trim(),
    trainerPreference: r.trainerPreference != null ? Number(r.trainerPreference) : null,
    trumpCard: !!r.trumpCard,
    priority: !!r.priority,
  };
}

const races = (meeting.races || [])
  .filter((r) => Array.isArray(r.runners))
  .map((race) => ({
    raceNo: Number(race.no),
    meta: buildMeta(race),
    runners: (race.runners || [])
      .filter((r) => r.status === 'Declared' && r.no)
      .map(buildRunner)
      .sort((a, b) => Number(a.no) - Number(b.no)),
  }))
  .sort((a, b) => a.raceNo - b.raceNo);

const out = PRE ? paths.resultsPreRaceWritePath(date) : paths.resultsFullWritePath(date);
const payload = {
  date,
  venue,
  mode: PRE ? 'pre' : 'post',
  races,
};
fs.writeFileSync(out, JSON.stringify(payload, null, 2), 'utf8');
console.log(`寫入 ${races.length} 場 → ${out} (mode=${PRE ? 'pre' : 'post'})`);
console.log(`venue: ${venue}`);
