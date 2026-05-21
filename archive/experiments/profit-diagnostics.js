// profit-diagnostics.js
// Explore profitable filters using existing V6/V7 backtests and dividend files.

const fs = require('fs');
const paths = require('./paths');

const DAYS = [
  '2026-05-13',
  '2026-05-09',
  '2026-05-03',
  '2026-04-29',
  '2026-04-26',
  '2026-04-22',
  '2026-04-19',
  '2026-04-15',
  '2026-04-12',
  '2026-04-08',
  '2026-03-22',
  '2026-03-18',
  '2026-03-15',
  '2026-03-11',
  '2026-03-08',
  '2026-03-04',
  '2026-03-01',
  '2026-02-25',
  '2026-02-22',
  '2026-02-11',
  '2026-02-08',
  '2026-02-04',
  '2026-02-01',
  '2026-01-28',
  '2026-01-25',
  '2026-01-18',
  '2026-01-14',
  '2026-01-11',
  '2026-01-07',
  '2026-01-04',
  '2026-01-01',
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function pay(dividends, poolName, combo, unordered = false) {
  const pool = dividends[poolName] || [];
  const key = unordered ? normalizeCombo(combo) : String(combo);
  const hit = pool.find((row) => {
    const rowCombo = unordered ? normalizeCombo(row.combo) : String(row.combo);
    return rowCombo === key;
  });
  return hit ? Number(hit.amount) || 0 : 0;
}

function normalizeCombo(combo) {
  return String(combo)
    .replace(/\s/g, '')
    .split(',')
    .filter(Boolean)
    .map(Number)
    .sort((a, b) => a - b)
    .join(',');
}

function pairCombos(top4) {
  const pairs = [];
  for (let i = 0; i < top4.length; i += 1) {
    for (let j = i + 1; j < top4.length; j += 1) {
      if (top4[i] && top4[j]) pairs.push([top4[i], top4[j]]);
    }
  }
  return pairs;
}

const STRATEGIES = {
  placeTop1(top4, actualTop3, div) {
    const top1 = top4[0];
    return { stake: 10, ret: actualTop3.includes(top1) ? pay(div, '位置', top1) : 0 };
  },
  placeTop2(top4, actualTop3, div) {
    const picks = top4.slice(0, 2);
    return {
      stake: 20,
      ret: picks.reduce((sum, no) => sum + (actualTop3.includes(no) ? pay(div, '位置', no) : 0), 0),
    };
  },
  placeTop3(top4, actualTop3, div) {
    const picks = top4.slice(0, 3);
    return {
      stake: 30,
      ret: picks.reduce((sum, no) => sum + (actualTop3.includes(no) ? pay(div, '位置', no) : 0), 0),
    };
  },
  qinTop12(top4, actualTop3, div) {
    const [a, b] = top4;
    const hit = (actualTop3[0] === a && actualTop3[1] === b) || (actualTop3[0] === b && actualTop3[1] === a);
    return { stake: 10, ret: hit ? pay(div, '連贏', `${a},${b}`, true) : 0 };
  },
  qinWheelTop1(top4, actualTop3, div) {
    const top1 = top4[0];
    let ret = 0;
    for (const other of top4.slice(1, 4)) {
      const hit = (actualTop3[0] === top1 && actualTop3[1] === other) || (actualTop3[0] === other && actualTop3[1] === top1);
      if (hit) ret += pay(div, '連贏', `${top1},${other}`, true);
    }
    return { stake: 30, ret };
  },
  qinTop4Box(top4, actualTop3, div) {
    let ret = 0;
    for (const [a, b] of pairCombos(top4.slice(0, 4))) {
      const hit = (actualTop3[0] === a && actualTop3[1] === b) || (actualTop3[0] === b && actualTop3[1] === a);
      if (hit) ret += pay(div, '連贏', `${a},${b}`, true);
    }
    return { stake: 60, ret };
  },
  qplTop3Box(top4, actualTop3, div) {
    let ret = 0;
    for (const [a, b] of pairCombos(top4.slice(0, 3))) {
      if (actualTop3.includes(a) && actualTop3.includes(b)) ret += pay(div, '位置Q', `${a},${b}`, true);
    }
    return { stake: 30, ret };
  },
  qplTop4Box(top4, actualTop3, div) {
    let ret = 0;
    for (const [a, b] of pairCombos(top4.slice(0, 4))) {
      if (actualTop3.includes(a) && actualTop3.includes(b)) ret += pay(div, '位置Q', `${a},${b}`, true);
    }
    return { stake: 60, ret };
  },
  quinellaPlaceCombo(top4, actualTop3, div) {
    const place = STRATEGIES.placeTop1(top4, actualTop3, div);
    const qin = STRATEGIES.qinWheelTop1(top4, actualTop3, div);
    return { stake: place.stake + qin.stake, ret: place.ret + qin.ret };
  },
  v6BestCombo(top4, actualTop3, div) {
    const place = STRATEGIES.placeTop1(top4, actualTop3, div);
    const qin = STRATEGIES.qinTop12(top4, actualTop3, div);
    const wheel = STRATEGIES.qinWheelTop1(top4, actualTop3, div);
    return { stake: place.stake + qin.stake + wheel.stake, ret: place.ret + qin.ret + wheel.ret };
  },
};

function loadRows() {
  const rows = [];
  for (const date of DAYS) {
    const v6File = paths.backtestPath('v6', date);
    const v7File = paths.backtestPath('v7', date);
    const divFile = paths.dividendsPath(date);
    if (!fs.existsSync(v6File) || !fs.existsSync(v7File) || !fs.existsSync(divFile)) continue;

    const v6 = readJson(v6File);
    const v7 = readJson(v7File);
    const dividends = readJson(divFile);
    const v7ByRace = new Map(v7.races.map((race) => [String(race.raceNo), race]));
    const divByRace = new Map(dividends.races.map((race) => [String(race.raceNo), race.dividends || {}]));

    for (const race of v6.races || []) {
      const v7Race = v7ByRace.get(String(race.raceNo));
      if (!race.v6Ranking?.length || !v7Race?.v7Ranking?.length || !race.actualTop3?.length) continue;
      const v6Top4 = race.v6Top4 || [];
      const v7Top4 = v7Race.v7Top4 || [];
      const v6Top1 = race.v6Ranking[0];
      const v7Top1 = v7Race.v7Ranking[0];
      const v6Gap = (race.v6Ranking[0]?.prob || 0) - (race.v6Ranking[1]?.prob || 0);
      const v7Gap = (v7Race.v7Ranking[0]?.prob || 0) - (v7Race.v7Ranking[1]?.prob || 0);
      const overlap = v6Top4.filter((no) => v7Top4.includes(no)).length;
      const unionTop4 = [...new Set([...v6Top4, ...v7Top4])];
      rows.push({
        date,
        month: date.slice(0, 7),
        venue: v6.venue,
        raceNo: race.raceNo,
        meta: race.meta || v7Race.meta || {},
        actualTop3: race.actualTop3,
        div: divByRace.get(String(race.raceNo)) || {},
        v6Top4,
        v7Top4,
        unionTop4,
        consensusTop4: v6Top4.filter((no) => v7Top4.includes(no)),
        v6Top1: v6Top1?.no,
        v7Top1: v7Top1?.no,
        v6Gap,
        v7Gap,
        v6TopProb: v6Top1?.prob || 0,
        v7TopProb: v7Top1?.prob || 0,
        v7TopConfidence: v7Top1?.confidence || 0,
        v7TopRecords: v7Top1?.records || 0,
        overlap,
        fieldSize: v7Race.fieldSize || v7Race.v7Ranking.length,
        distance: v7Race.meta?.distance || race.meta?.distance,
        className: v7Race.meta?.className || race.meta?.className,
      });
    }
  }
  return rows;
}

const FILTERS = {
  all: () => true,
  recent: (row) => row.date >= '2026-04-01',
  janMar: (row) => row.date < '2026-04-01',
  st: (row) => row.venue === 'ST',
  hv: (row) => row.venue === 'HV',
  coreDist: (row) => [1200, 1400, 1650, 1800].includes(row.distance),
  noSprint1000: (row) => row.distance !== 1000,
  field10Plus: (row) => row.fieldSize >= 10,
  field12Plus: (row) => row.fieldSize >= 12,
  v6GapMid: (row) => row.v6Gap >= 0.4 && row.v6Gap <= 2.8,
  v6GapStrong: (row) => row.v6Gap >= 1.0,
  v6GapNotHuge: (row) => row.v6Gap < 3.0,
  v7GapMid: (row) => row.v7Gap >= 0.4 && row.v7Gap <= 2.8,
  v7Conf50: (row) => row.v7TopConfidence >= 0.5,
  v7Conf55: (row) => row.v7TopConfidence >= 0.55,
  v7Records3: (row) => row.v7TopRecords >= 3,
  top1Agree: (row) => row.v6Top1 === row.v7Top1,
  top1Disagree: (row) => row.v6Top1 !== row.v7Top1,
  overlap3: (row) => row.overlap >= 3,
  overlap2: (row) => row.overlap >= 2,
  class2to4: (row) => ['第二班', '第三班', '第四班'].includes(row.className),
  class4: (row) => row.className === '第四班',
  notGriffin: (row) => row.className !== '新馬賽',
};

const FILTER_SETS = [
  ['all'],
  ['recent'],
  ['janMar'],
  ['coreDist'],
  ['field10Plus', 'coreDist'],
  ['field12Plus', 'coreDist'],
  ['field10Plus', 'coreDist', 'notGriffin'],
  ['field10Plus', 'coreDist', 'v6GapMid'],
  ['field10Plus', 'coreDist', 'v6GapNotHuge'],
  ['field10Plus', 'coreDist', 'v6GapStrong'],
  ['field10Plus', 'coreDist', 'v7GapMid'],
  ['field10Plus', 'coreDist', 'overlap2'],
  ['field10Plus', 'coreDist', 'overlap3'],
  ['field10Plus', 'coreDist', 'top1Agree'],
  ['field10Plus', 'coreDist', 'top1Disagree'],
  ['field10Plus', 'coreDist', 'v7Conf50'],
  ['field10Plus', 'coreDist', 'v7Conf55'],
  ['field10Plus', 'coreDist', 'v7Records3'],
  ['field10Plus', 'coreDist', 'class2to4'],
  ['field10Plus', 'coreDist', 'class4'],
  ['recent', 'field10Plus', 'coreDist'],
  ['recent', 'field10Plus', 'coreDist', 'v6GapMid'],
  ['recent', 'field10Plus', 'coreDist', 'overlap2'],
  ['recent', 'field10Plus', 'coreDist', 'top1Agree'],
  ['recent', 'field10Plus', 'coreDist', 'top1Disagree'],
  ['recent', 'field10Plus', 'coreDist', 'class2to4'],
];

function makeFilter(names) {
  return (row) => names.every((name) => FILTERS[name](row));
}

function evaluate(rows, top4Source, strategyName, filterNames) {
  const strategy = STRATEGIES[strategyName];
  const filter = makeFilter(filterNames);
  const result = {
    model: top4Source,
    strategy: strategyName,
    filter: filterNames.join('+'),
    races: 0,
    stake: 0,
    ret: 0,
    hits: 0,
    months: {},
  };

  for (const row of rows) {
    if (!filter(row)) continue;
    const top4 = row[top4Source];
    if (!top4?.length) continue;
    const played = strategy(top4, row.actualTop3, row.div);
    if (!played.stake) continue;
    result.races += 1;
    result.stake += played.stake;
    result.ret += played.ret;
    if (played.ret > played.stake) result.hits += 1;

    if (!result.months[row.month]) result.months[row.month] = { races: 0, stake: 0, ret: 0 };
    result.months[row.month].races += 1;
    result.months[row.month].stake += played.stake;
    result.months[row.month].ret += played.ret;
  }

  result.profit = result.ret - result.stake;
  result.roi = result.stake ? (result.profit / result.stake) * 100 : 0;
  result.hitRate = result.races ? (result.hits / result.races) * 100 : 0;
  result.positiveMonths = Object.values(result.months).filter((month) => month.ret > month.stake).length;
  result.monthCount = Object.keys(result.months).length;
  result.worstMonthRoi = Object.values(result.months).reduce((worst, month) => {
    const roi = month.stake ? ((month.ret - month.stake) / month.stake) * 100 : 0;
    return Math.min(worst, roi);
  }, 0);
  return result;
}

function run() {
  const rows = loadRows();
  const results = [];
  const sources = ['v6Top4', 'v7Top4', 'unionTop4', 'consensusTop4'];
  const strategies = Object.keys(STRATEGIES);

  for (const source of sources) {
    for (const strategy of strategies) {
      for (const filter of FILTER_SETS) {
        const result = evaluate(rows, source, strategy, filter);
        if (result.races >= 8 && result.stake > 0) results.push(result);
      }
    }
  }

  results.sort((a, b) => {
    const scoreA = a.roi + a.profit / 100 + a.positiveMonths * 3 + Math.min(a.races, 80) * 0.05 + a.worstMonthRoi * 0.10;
    const scoreB = b.roi + b.profit / 100 + b.positiveMonths * 3 + Math.min(b.races, 80) * 0.05 + b.worstMonthRoi * 0.10;
    return scoreB - scoreA;
  });

  const report = {
    generatedAt: new Date().toISOString(),
    rows: rows.length,
    top: results.slice(0, 80),
  };
  fs.writeFileSync('profit-diagnostics-report.json', JSON.stringify(report, null, 2), 'utf8');

  console.log(`Rows evaluated: ${rows.length}`);
  console.log('Top filters by ROI/profit/month stability:');
  console.log('Model       | Strategy             | Filter                                            | Races | Stake | Ret   | Profit | ROI    | M+ | WorstM');
  console.log('-'.repeat(132));
  results.slice(0, 30).forEach((r) => {
    console.log(
      [
        r.model.padEnd(11),
        r.strategy.padEnd(20),
        r.filter.slice(0, 49).padEnd(49),
        String(r.races).padStart(5),
        String(r.stake).padStart(5),
        r.ret.toFixed(0).padStart(5),
        signed(r.profit).padStart(7),
        `${r.roi.toFixed(1)}%`.padStart(7),
        `${r.positiveMonths}/${r.monthCount}`.padStart(3),
        `${r.worstMonthRoi.toFixed(0)}%`.padStart(7),
      ].join(' | '),
    );
  });
  console.log('\nWritten: profit-diagnostics-report.json');
}

function signed(value) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(0)}`;
}

if (require.main === module) {
  run();
}
