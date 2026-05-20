// backtest.js
// 對歷史賽馬日做 walk-forward 回測:用 features-pro 共用 module 計 14-feature
// 同 advanced-analysis.js 用同一份公式,差異只係 caller 餵嘅 records 範圍
// 用法:
//   DATE=2026-05-09 RESULTS=results-full-2026-05-09.json HORSES=horses-2026-05-09.json node backtest.js

const fs = require('fs');
const paths = require('./paths');
const F = require('./features-pro');

const DATE = process.env.DATE || '2026-05-09';
const RESULTS = process.env.RESULTS || paths.resultsFullPath(DATE);
const HORSES = process.env.HORSES || paths.horsesPath(`horses-${DATE}.json`);
const OUT = process.env.OUT || paths.backtestWritePath('pro', DATE);

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

function raceClassNo(className) {
  const map = { 第一班: 1, 第二班: 2, 第三班: 3, 第四班: 4, 第五班: 5 };
  return map[className] ?? null;
}

// Walk-forward: history = records strictly before RACE_DATE
function buildRunner(resultRunner) {
  const horse = horseByCode.get(resultRunner.code);
  if (!horse) return null;

  const d = DATE.split('-');
  const targetDMY = `${d[2]}/${d[1]}/${d[0].slice(2)}`;
  const raceDayRecord = horse.records.find((r) => r.date === targetDMY);

  const history = horse.records.filter((r) => {
    const dt = F.parseDateDMY(r.date);
    return dt && dt < RACE_DATE;
  });

  const draw = raceDayRecord ? F.numberValue(raceDayRecord.draw) : F.numberValue(resultRunner.draw);
  const handicapWeight = raceDayRecord ? F.numberValue(raceDayRecord.actWt) : F.numberValue(resultRunner.actualWeight);
  const bodyWeight = raceDayRecord ? F.numberValue(raceDayRecord.bodyWeight) : F.numberValue(resultRunner.bodyWeight);
  const rating = raceDayRecord ? F.numberValue(raceDayRecord.rating) : F.numberValue(horse.profile['Current Rating']);
  const last6run = history.slice(0, 6).map((r) => r.place).join('/');

  let w = 0, s = 0, t = 0;
  history.forEach((r) => {
    const p = F.parsePlace(r.place);
    if (p === 1) w++;
    else if (p === 2) s++;
    else if (p === 3) t++;
  });
  const careerStats = `${w}-${s}-${t}-${history.length}`;

  return {
    no: resultRunner.no,
    name: resultRunner.name,
    code: resultRunner.code,
    draw,
    handicapWeight,
    bodyWeight,
    rating,
    last6run,
    jockey: resultRunner.jockey,
    trainer: resultRunner.trainer,
    age: (horse.profile['Country of Origin / Age'] || '').trim(),
    careerStats,
    records: history,
    plc: resultRunner.plc,
    winOdds: F.numberValue(resultRunner.winOdds),
  };
}

const races = resultsData.races.map((race) => {
  const enriched = race.runners.map(buildRunner).filter(Boolean);
  const withFeatures = F.buildFeatures(enriched, {
    venue: VENUE,
    distance: F.numberValue(race.meta.distance),
    classNo: raceClassNo(race.meta.className),
    going: race.meta.going,
    raceDate: RACE_DATE,
  });

  const origRaw = withFeatures.map((r) => F.originalRawScore(r.features));
  const origProb = F.softmaxProb(origRaw, withFeatures.length, 'orig');

  const withPro = F.applyProfessional(withFeatures);
  const proProb = F.softmaxProb(withPro.map((r) => r.proRawScore), withPro.length, 'pro');

  const rows = withFeatures.map((r, i) => ({ ...r, origProb: origProb[i], proProb: proProb[i] }));

  const origRanked = [...rows].sort((a, b) => b.origProb - a.origProb);
  const proRanked = [...rows].sort((a, b) => b.proProb - a.proProb);
  const actualTop3 = [...race.runners]
    .filter((x) => /^\d+$/.test(x.plc))
    .sort((a, b) => +a.plc - +b.plc)
    .slice(0, 3)
    .map((x) => x.no);

  const summarize = (r, prob) => ({
    no: r.no,
    name: r.name,
    prob: +prob.toFixed(2),
    draw: r.draw,
    rating: r.rating,
    recordsCount: r.recordsCount,
    plc: r.plc,
    winOdds: r.winOdds,
  });

  return {
    raceNo: race.raceNo,
    meta: race.meta,
    actualTop3,
    origTop4: origRanked.slice(0, 4).map((x) => x.no),
    proTop4: proRanked.slice(0, 4).map((x) => x.no),
    origRanking: origRanked.map((r) => summarize(r, r.origProb)),
    proRanking: proRanked.map((r) => summarize(r, r.proProb)),
  };
});

let origHit = 0, proHit = 0, origChamp = 0, proChamp = 0;
races.forEach((r) => {
  if (r.origTop4.some((n) => r.actualTop3.includes(n))) origHit++;
  if (r.proTop4.some((n) => r.actualTop3.includes(n))) proHit++;
  if (r.origTop4.includes(r.actualTop3[0])) origChamp++;
  if (r.proTop4.includes(r.actualTop3[0])) proChamp++;
});

console.log(`\n=== Backtest ${DATE} ${VENUE} 共 ${races.length} 場 ===`);
console.log(`Original     Top4 命中頭三任一: ${origHit}/${races.length} = ${(origHit / races.length * 100).toFixed(1)}%`);
console.log(`Professional Top4 命中頭三任一: ${proHit}/${races.length} = ${(proHit / races.length * 100).toFixed(1)}%`);
console.log(`Original     Top4 命中冠軍:     ${origChamp}/${races.length} = ${(origChamp / races.length * 100).toFixed(1)}%`);
console.log(`Professional Top4 命中冠軍:     ${proChamp}/${races.length} = ${(proChamp / races.length * 100).toFixed(1)}%`);

console.log('\n=== 逐場 ===');
races.forEach((r) => {
  const hOrig = r.origTop4.filter((n) => r.actualTop3.includes(n)).length;
  const hPro = r.proTop4.filter((n) => r.actualTop3.includes(n)).length;
  const origChampRank = r.origRanking.findIndex((x) => x.no === r.actualTop3[0]) + 1;
  const proChampRank = r.proRanking.findIndex((x) => x.no === r.actualTop3[0]) + 1;
  console.log(
    `R${r.raceNo} 實際=${r.actualTop3.join('-')} | Orig=${r.origTop4.join('-')}(${hOrig}) | Pro=${r.proTop4.join('-')}(${hPro}) | 冠軍 origRank=${origChampRank} proRank=${proChampRank}`,
  );
});

fs.writeFileSync(OUT, JSON.stringify({ date: DATE, venue: VENUE, races }, null, 2), 'utf8');
console.log(`\n細節寫入 ${OUT}`);
