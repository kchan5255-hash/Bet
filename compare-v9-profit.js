// compare-v9-profit.js
// Profit report for V9 percentile-reliability recommendations.

const fs = require('fs');
const paths = require('./paths');
const { runBacktest: runV9 } = require('./model-v9');

const POOL_QIN = '\u9023\u8d0f';
const POOL_PLACE = '\u4f4d\u7f6e';
const LEGACY_POOL_QIN = '???';
const LEGACY_POOL_PLACE = '\u96ff\uf699\u852d';

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

function ensureV9(date) {
  const file = paths.backtestPath('v9', date);
  if (process.env.REBUILD_V9 === '1' || !fs.existsSync(file)) {
    const writeFile = paths.backtestWritePath('v9', date);
    runV9({
      date,
      results: paths.resultsFullPath(date),
      out: writeFile,
      quiet: true,
    });
    return readJson(writeFile);
  }
  return readJson(file);
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

function pay(dividends, poolName, horses) {
  const pool = dividends[poolName] || [];
  const key = Array.isArray(horses) ? normalizeCombo(horses.join(',')) : normalizeCombo(horses);
  const hit = pool.find((row) => normalizeCombo(row.combo) === key);
  return hit ? Number(hit.amount) || 0 : 0;
}

function blankAgg() {
  return {
    races: 0,
    bets: 0,
    stake: 0,
    ret: 0,
    profit: 0,
    hits: 0,
  };
}

function settleBet(bet, actualTop3, dividends) {
  if (bet.pool === POOL_QIN || bet.pool === LEGACY_POOL_QIN) {
    const [a, b] = bet.horses.map(String);
    const hit = (actualTop3[0] === a && actualTop3[1] === b) || (actualTop3[0] === b && actualTop3[1] === a);
    return {
      stake: bet.stake,
      ret: hit ? pay(dividends, POOL_QIN, bet.horses) : 0,
      hit,
    };
  }

  if (bet.pool === POOL_PLACE || bet.pool === LEGACY_POOL_PLACE) {
    const no = String(bet.horses[0]);
    const hit = actualTop3.includes(no);
    const pool = dividends[POOL_PLACE] || [];
    const row = pool.find((item) => String(item.combo) === no);
    return {
      stake: bet.stake,
      ret: hit && row ? Number(row.amount) || 0 : 0,
      hit,
    };
  }

  return { stake: bet.stake || 0, ret: 0, hit: false };
}

function addAgg(agg, settled) {
  agg.bets += 1;
  agg.stake += settled.stake;
  agg.ret += settled.ret;
  agg.profit = agg.ret - agg.stake;
  if (settled.ret > settled.stake) agg.hits += 1;
}

function finalize(agg) {
  return {
    ...agg,
    profit: agg.ret - agg.stake,
    roi: agg.stake ? ((agg.ret - agg.stake) / agg.stake) * 100 : 0,
    hitRate: agg.bets ? (agg.hits / agg.bets) * 100 : 0,
  };
}

function addRankStats(stats, race) {
  const ranking = race.v9Ranking || [];
  const top4 = race.v9Top4 || [];
  const winner = race.actualTop3?.[0];
  if (!winner || !ranking.length) return;

  stats.races += 1;
  if (top4.some((no) => race.actualTop3.includes(no))) stats.top4Hit += 1;
  if (top4.includes(winner)) stats.winnerTop4 += 1;
  if (ranking[0]?.no === winner) stats.top1Win += 1;

  const winnerIndex = ranking.findIndex((runner) => runner.no === winner);
  stats.winnerRankSum += winnerIndex >= 0 ? winnerIndex + 1 : ranking.length + 1;
}

function blankRankStats() {
  return {
    races: 0,
    top4Hit: 0,
    winnerTop4: 0,
    top1Win: 0,
    winnerRankSum: 0,
  };
}

function finalizeRankStats(stats) {
  return {
    races: stats.races,
    top4Hit: stats.top4Hit,
    top4HitRate: stats.races ? (stats.top4Hit / stats.races) * 100 : 0,
    winnerTop4: stats.winnerTop4,
    winnerTop4Rate: stats.races ? (stats.winnerTop4 / stats.races) * 100 : 0,
    top1Win: stats.top1Win,
    top1WinRate: stats.races ? (stats.top1Win / stats.races) * 100 : 0,
    avgWinnerRank: stats.races ? stats.winnerRankSum / stats.races : 0,
  };
}

function run() {
  const total = blankAgg();
  const rankTotal = blankRankStats();
  const daily = [];
  const byMonth = {};
  const byRiskTier = {};
  const racesPlayed = [];

  for (const date of DAYS) {
    const divFile = paths.dividendsPath(date);
    if (!fs.existsSync(divFile) || !fs.existsSync(paths.resultsFullPath(date))) continue;

    const v9 = ensureV9(date);
    const divs = readJson(divFile);
    const divByRace = new Map((divs.races || []).map((race) => [String(race.raceNo), race.dividends || {}]));
    const dayRank = blankRankStats();
    const day = {
      date,
      venue: v9.venue,
      scheduledRaces: v9.races.length,
      ...blankAgg(),
    };
    const month = date.slice(0, 7);
    if (!byMonth[month]) byMonth[month] = blankAgg();

    for (const race of v9.races || []) {
      addRankStats(rankTotal, race);
      addRankStats(dayRank, race);

      const bets = race.recommendations?.bets || [];
      if (!bets.length) continue;
      day.races += 1;
      total.races += 1;
      byMonth[month].races += 1;
      const raceResult = {
        date,
        venue: v9.venue,
        raceNo: race.raceNo,
        actualTop3: race.actualTop3,
        v9Top4: race.v9Top4,
        signals: race.signals,
        bets: [],
        stake: 0,
        ret: 0,
      };

      for (const bet of bets) {
        const settled = settleBet(bet, race.actualTop3 || [], divByRace.get(String(race.raceNo)) || {});
        addAgg(day, settled);
        addAgg(total, settled);
        addAgg(byMonth[month], settled);

        const riskTier = bet.riskTier || 'unknown';
        if (!byRiskTier[riskTier]) byRiskTier[riskTier] = blankAgg();
        byRiskTier[riskTier].races += 1;
        addAgg(byRiskTier[riskTier], settled);

        raceResult.stake += settled.stake;
        raceResult.ret += settled.ret;
        raceResult.bets.push({
          id: bet.id,
          pool: bet.pool,
          horses: bet.horses,
          stake: settled.stake,
          ret: settled.ret,
          hit: settled.hit,
          riskTier,
        });
      }
      raceResult.profit = raceResult.ret - raceResult.stake;
      racesPlayed.push(raceResult);
    }

    daily.push({
      ...finalize(day),
      rank: finalizeRankStats(dayRank),
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    model: 'v9-percentile-reliability',
    total: finalize(total),
    rank: finalizeRankStats(rankTotal),
    byMonth: Object.fromEntries(Object.entries(byMonth).map(([key, value]) => [key, finalize(value)])),
    byRiskTier: Object.fromEntries(Object.entries(byRiskTier).map(([key, value]) => [key, finalize(value)])),
    daily,
    racesPlayed,
  };
  report.risk = riskSummary(racesPlayed);
  fs.writeFileSync('compare-v9-profit-report.json', JSON.stringify(report, null, 2), 'utf8');

  printReport(report);
}

function printReport(report) {
  const t = report.total;
  const rank = report.rank;
  console.log('\n=== V9 Percentile-Reliability Report ===');
  console.log(`Rank test: Top4 any placed ${rank.top4Hit}/${rank.races} (${rank.top4HitRate.toFixed(1)}%) | Winner in Top4 ${rank.winnerTop4}/${rank.races} (${rank.winnerTop4Rate.toFixed(1)}%) | Top1 winner ${rank.top1Win}/${rank.races} (${rank.top1WinRate.toFixed(1)}%) | Avg winner rank ${rank.avgWinnerRank.toFixed(2)}`);
  console.log(`Profit test: Played races ${t.races} | Bets ${t.bets} | Stake $${t.stake.toFixed(0)} | Return $${t.ret.toFixed(0)} | Profit ${signed(t.profit)} | ROI ${t.roi.toFixed(2)}% | Hit ${t.hits}/${t.bets}`);

  console.log('\nBy month:');
  console.log('Month    | Races | Bets | Stake | Return | Profit | ROI');
  console.log('-'.repeat(70));
  Object.entries(report.byMonth).sort().forEach(([month, row]) => {
    console.log(
      [
        month,
        String(row.races).padStart(5),
        String(row.bets).padStart(4),
        `$${row.stake.toFixed(0)}`.padStart(6),
        `$${row.ret.toFixed(0)}`.padStart(7),
        signed(row.profit).padStart(7),
        `${row.roi.toFixed(1)}%`.padStart(7),
      ].join(' | '),
    );
  });

  console.log('\nBy risk tier:');
  Object.entries(report.byRiskTier).sort().forEach(([tier, row]) => {
    console.log(`${tier.padEnd(12)} bets ${String(row.bets).padStart(4)} | ROI ${row.roi.toFixed(1).padStart(7)}% | profit ${signed(row.profit)}`);
  });

  console.log('\nRisk:');
  console.log(`Max drawdown: ${signed(report.risk.maxDrawdown)} | Longest losing streak: ${report.risk.longestLosingStreak} bets | Hit rate: ${report.total.hitRate.toFixed(1)}%`);

  console.log('\nWritten: compare-v9-profit-report.json');
}

function signed(value) {
  return `${value >= 0 ? '+$' : '-$'}${Math.abs(value).toFixed(0)}`;
}

function riskSummary(racesPlayed) {
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let currentLosingStreak = 0;
  let longestLosingStreak = 0;

  const sequence = [...racesPlayed].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return Number(a.raceNo) - Number(b.raceNo);
  });

  for (const race of sequence) {
    equity += race.profit;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, equity - peak);
    if (race.profit <= 0) {
      currentLosingStreak += 1;
      longestLosingStreak = Math.max(longestLosingStreak, currentLosingStreak);
    } else {
      currentLosingStreak = 0;
    }
  }

  return {
    maxDrawdown,
    longestLosingStreak,
    finalEquity: equity,
  };
}

if (require.main === module) {
  run();
}
