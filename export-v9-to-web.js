// export-v9-to-web.js
// 把 data/backtest/v9/{year}/backtest-v9-{date}.json 轉成 web/src/data/v9-results.json，
// 供 web 端 RaceViewer toggle V9 時直接讀取（避免在前端重算）。
//
// 用法：
//   node export-v9-to-web.js                        # 預設 5/3 5/9 5/13
//   node export-v9-to-web.js 2026-05-13 2026-05-09  # 指定多個日期

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const DATES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['2026-05-03', '2026-05-09', '2026-05-13'];

function convertRace(race) {
  return {
    raceNo: race.raceNo,
    v9Temp: race.v9Temp,
    v9Top4: race.v9Top4,
    signals: race.signals,
    runners: (race.v9Ranking || []).map((r) => ({
      no: String(r.no),
      rank: r.rank,
      rawScore: r.score,
      modelProbability: r.prob,
      reliability: r.reliability,
      groups: r.groups,
      topFactors: r.topFactors,
    })),
  };
}

function loadV9(date) {
  const file = paths.backtestPath('v9', date);
  if (!fs.existsSync(file)) {
    throw new Error(`V9 backtest not found for ${date}: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const dates = [];
const byDate = {};
for (const date of DATES) {
  const v9 = loadV9(date);
  byDate[date] = {
    date,
    venue: v9.venue,
    model: v9.model,
    races: (v9.races || []).map(convertRace),
  };
  dates.push(date);
}

dates.sort();

const output = {
  dates,
  byDate,
  generatedAt: new Date().toISOString(),
};

const outFile = path.join(__dirname, 'web', 'src', 'data', 'v9-results.json');
fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');
console.log(`Wrote ${dates.length} dates → ${outFile}`);
for (const d of dates) console.log(`  ${d} (${byDate[d].races.length} races)`);

