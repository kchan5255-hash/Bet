// pro-cold-potential-v1.js
//
// Pro Cold Potential V1:
// - Uses Pro model ranking/probability from backtest-v6-YYYY-MM-DD.json.
// - Does not use current odds.
// - Scores pure Pro data strength, then subtracts public/hot-signal penalties.
// - Outputs one primary and one secondary pick per race.

const fs = require('fs');
const paths = require('./paths');

const VERSION = 'pro-cold-potential-v1';
const DEFAULT_DAYS = ['2026-05-13'];

const POLICY = {
  minPicksPerRace: Number(process.env.MIN_PICKS_PER_RACE || 2),
  topPerRace: Number(process.env.TOP_PER_RACE || 2),
  strict: {
    minProRank: 4,
    maxProRank: 10,
    maxProProb: 11.5,
    minDataScore: 0.48,
  },
  fallback: {
    minProRank: 3,
    maxProRank: 12,
    maxProProb: 14.0,
    minDataScore: 0.40,
  },
};

const ELITE_JOCKEYS = new Set([
  '\u6f58\u9813', // 潘頓
  '\u83ab\u96f7\u62c9', // 莫雷拉
  '\u5e03\u6587', // 布文
]);

const HOT_TRAINERS = new Set([
  '\u8521\u7d04\u7ff0', // 蔡約翰
  '\u65b9\u5609\u67cf', // 方嘉柏
  '\u6c88\u96c6\u6210', // 沈集成
  '\u544a\u6771\u5c3c', // 告東尼
  '\u7f85\u5bcc\u5168', // 羅富全
  '\u5442\u5065\u5a01', // 呂健威
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function number(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return (min + max) / 2;
  return Math.max(min, Math.min(max, value));
}

function parsePlace(value) {
  const parsed = parseInt(String(value || '').replace(/^0+/, ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function norm(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

function daysFromEnv() {
  if (process.env.DAYS) {
    if (process.env.DAYS.toLowerCase() === 'all') {
      return fs
        .readdirSync(process.cwd())
        .map((file) => file.match(/^backtest-v6-(\d{4}-\d{2}-\d{2})\.json$/)?.[1])
        .filter(Boolean)
        .sort();
    }
    return process.env.DAYS.split(',').map((item) => item.trim()).filter(Boolean);
  }
  if (process.env.DATE) return [process.env.DATE];
  return DEFAULT_DAYS;
}

function runnerInfoMap(results) {
  const map = new Map();
  for (const race of results.races || []) {
    for (const runner of race.runners || []) {
      map.set(`${race.raceNo}|${runner.no}`, runner);
      if (runner.code) map.set(`${race.raceNo}|${runner.code}`, runner);
    }
  }
  return map;
}

function rankingMap(ranking) {
  const map = new Map();
  (ranking || []).forEach((runner, index) => {
    const rank = number(runner.rank, index + 1);
    map.set(String(runner.no), {
      rank,
      prob: number(runner.prob, 0),
      top2: rank <= 2,
      top4: rank <= 4,
      top6: rank <= 6,
      top8: rank <= 8,
    });
  });
  return map;
}

function modelComparison(no, maps) {
  return Object.fromEntries(
    Object.entries(maps).map(([model, map]) => {
      const row = map.get(String(no));
      return [
        model,
        row
          ? {
              rank: row.rank,
              prob: row.prob,
              top2: row.top2,
              top4: row.top4,
              top6: row.top6,
              top8: row.top8,
            }
          : null,
      ];
    }),
  );
}

function supportSummary(models) {
  const rows = Object.values(models).filter(Boolean);
  return {
    top2Count: rows.filter((row) => row.top2).length,
    top4Count: rows.filter((row) => row.top4).length,
    top6Count: rows.filter((row) => row.top6).length,
    top8Count: rows.filter((row) => row.top8).length,
  };
}

function isStarter(proRunner, info) {
  const place = String(info?.plc ?? proRunner.plc ?? '').trim();
  const draw = String(info?.draw ?? '').trim();
  if (place === '' || place === '---') return false;
  if (draw === '---') return false;
  return true;
}

function proDataScore(proRunner, fieldSize) {
  const rank = number(proRunner.rank, fieldSize);
  const prob = number(proRunner.prob, 0);
  const averageProb = fieldSize ? 100 / fieldSize : 8;
  const rankScore = 1 - ((rank - 1) / Math.max(1, fieldSize - 1));
  const relativeProbScore = clamp((prob / averageProb - 0.55) / 1.05, 0, 1);
  return clamp(0.52 * rankScore + 0.48 * relativeProbScore, 0, 1);
}

function heatPenalty(proRunner, info, support) {
  const rank = number(proRunner.rank, 99);
  const prob = number(proRunner.prob, 0);
  const jockey = norm(info.jockey);
  const trainer = norm(info.trainer);
  let penalty = 0;

  if (rank <= 2) penalty += 0.18;
  else if (rank === 3) penalty += 0.10;
  else if (rank === 4) penalty += 0.055;

  if (prob >= 13.0) penalty += 0.08;
  else if (prob >= 11.5) penalty += 0.055;
  else if (prob >= 10.0) penalty += 0.03;

  if (ELITE_JOCKEYS.has(jockey)) penalty += 0.065;
  if (HOT_TRAINERS.has(trainer)) penalty += 0.035;

  if (support.top2Count >= 2) penalty += 0.10;
  else if (support.top4Count >= 3) penalty += 0.065;
  else if (support.top6Count >= 4) penalty += 0.03;

  return penalty;
}

function selectionTier(proRunner, dataScore) {
  const rank = number(proRunner.rank, 99);
  const prob = number(proRunner.prob, 99);
  if (
    rank >= POLICY.strict.minProRank &&
    rank <= POLICY.strict.maxProRank &&
    prob <= POLICY.strict.maxProProb &&
    dataScore >= POLICY.strict.minDataScore
  ) {
    return 'strict';
  }
  if (
    rank >= POLICY.fallback.minProRank &&
    rank <= POLICY.fallback.maxProRank &&
    prob <= POLICY.fallback.maxProProb &&
    dataScore >= POLICY.fallback.minDataScore
  ) {
    return 'fallback';
  }
  return 'forced-backup';
}

function riskLabels(candidate) {
  const labels = [];
  if (candidate.selectionTier !== 'strict') labels.push(candidate.selectionTier);
  if (candidate.heatPenalty >= 0.16) labels.push('hot-signal');
  if (candidate.support.top2Count >= 2) labels.push('cross-model-hot');
  if (candidate.proRank <= 3) labels.push('near-favorite');
  if (candidate.prob >= 11.5) labels.push('high-prob');
  return labels;
}

function candidateFromRunner({ date, venue, raceNo, distance, fieldSize, proRunner, info, maps }) {
  const models = modelComparison(proRunner.no, maps);
  const support = supportSummary(models);
  const dataScore = proDataScore(proRunner, fieldSize);
  const penalty = heatPenalty(proRunner, info, support);
  const place = parsePlace(info.plc ?? proRunner.plc);
  const candidate = {
    date,
    venue,
    raceNo,
    distance,
    no: String(proRunner.no),
    name: info.name || proRunner.name,
    code: info.code || proRunner.code || null,
    jockey: info.jockey || null,
    trainer: info.trainer || null,
    proRank: proRunner.rank,
    proProb: number(proRunner.prob, 0),
    dataScore: Number(dataScore.toFixed(4)),
    heatPenalty: Number(penalty.toFixed(4)),
    coldPotentialScore: Number((dataScore - penalty).toFixed(4)),
    selectionTier: selectionTier(proRunner, dataScore),
    resultPlace: place,
    resultRaw: String(info.plc ?? proRunner.plc ?? ''),
    placed: place != null && place <= 3,
    fourth: place === 4,
    won: place === 1,
    modelComparison: models,
    support,
    risks: [],
  };
  candidate.risks = riskLabels(candidate);
  return candidate;
}

function sortCandidates(a, b) {
  if (b.coldPotentialScore !== a.coldPotentialScore) return b.coldPotentialScore - a.coldPotentialScore;
  if (b.dataScore !== a.dataScore) return b.dataScore - a.dataScore;
  return a.proRank - b.proRank;
}

function addUnique(target, source, limit) {
  const seen = new Set(target.map((candidate) => candidate.no));
  for (const candidate of source) {
    if (target.length >= limit) break;
    if (seen.has(candidate.no)) continue;
    target.push(candidate);
    seen.add(candidate.no);
  }
}

function analyzeRace({ date, venue, v6Race, v8Race, v9Race, infoByRunner }) {
  const proRanking = (v6Race.proRanking || []).map((runner, index) => ({ ...runner, rank: index + 1 }));
  const maps = {
    Pro: rankingMap(proRanking),
    V6: rankingMap(v6Race.v6Ranking || []),
    V8: rankingMap(v8Race.v8Ranking || []),
    V9: rankingMap(v9Race.v9Ranking || []),
  };
  const fieldSize = proRanking.length;
  const all = [];

  for (const proRunner of proRanking) {
    const info = infoByRunner.get(`${v6Race.raceNo}|${proRunner.no}`) || {};
    if (!isStarter(proRunner, info)) continue;
    const candidate = candidateFromRunner({
      date,
      venue,
      raceNo: v6Race.raceNo,
      distance: v6Race.meta?.distance || v8Race.meta?.distance || v9Race.meta?.distance,
      fieldSize,
      proRunner,
      info,
      maps,
    });
    all.push(candidate);
  }

  const limit = Math.max(POLICY.minPicksPerRace, POLICY.topPerRace);
  const eligible = all.filter((candidate) => candidate.selectionTier !== 'forced-backup').sort(sortCandidates);
  const forcedBackup = all.filter((candidate) => candidate.selectionTier === 'forced-backup').sort(sortCandidates);
  const candidates = [];
  addUnique(candidates, eligible, limit);
  addUnique(candidates, forcedBackup, limit);

  return {
    date,
    venue,
    raceNo: v6Race.raceNo,
    distance: v6Race.meta?.distance || v8Race.meta?.distance || v9Race.meta?.distance,
    actualTop3: (v6Race.actualTop3 || []).map(String),
    candidates: candidates.slice(0, POLICY.topPerRace),
    strictCandidateCount: all.filter((candidate) => candidate.selectionTier === 'strict').length,
    fallbackCandidateCount: all.filter((candidate) => candidate.selectionTier === 'fallback').length,
    forcedBackupCandidateCount: forcedBackup.length,
  };
}

function analyzeDay(date) {
  const files = {
    v6: paths.backtestPath('v6', date),
    v8: paths.backtestPath('v8', date),
    v9: paths.backtestPath('v9', date),
    results: paths.resultsFullPath(date),
  };
  for (const file of Object.values(files)) {
    if (!fs.existsSync(file)) return { date, skipped: true, reason: `missing ${file}` };
  }

  const v6 = readJson(files.v6);
  const v8 = readJson(files.v8);
  const v9 = readJson(files.v9);
  const results = readJson(files.results);
  const v8ByRace = new Map((v8.races || []).map((race) => [String(race.raceNo), race]));
  const v9ByRace = new Map((v9.races || []).map((race) => [String(race.raceNo), race]));
  const infoByRunner = runnerInfoMap(results);
  const races = [];

  for (const v6Race of v6.races || []) {
    const v8Race = v8ByRace.get(String(v6Race.raceNo));
    const v9Race = v9ByRace.get(String(v6Race.raceNo));
    if (!v8Race || !v9Race) continue;
    races.push(analyzeRace({
      date,
      venue: v6.venue || v8.venue || v9.venue,
      v6Race,
      v8Race,
      v9Race,
      infoByRunner,
    }));
  }

  return {
    date,
    venue: v6.venue || v8.venue || v9.venue,
    skipped: false,
    races,
  };
}

function blankStats() {
  return {
    races: 0,
    racesWithPick: 0,
    primaryPicks: 0,
    primaryWins: 0,
    primaryPlaced: 0,
    candidatePicks: 0,
    candidateWins: 0,
    candidatePlaced: 0,
  };
}

function addStats(stats, candidates) {
  if (!candidates.length) return;
  stats.racesWithPick += 1;
  const primary = candidates[0];
  stats.primaryPicks += 1;
  if (primary.won) stats.primaryWins += 1;
  if (primary.placed) stats.primaryPlaced += 1;
  for (const candidate of candidates) {
    stats.candidatePicks += 1;
    if (candidate.won) stats.candidateWins += 1;
    if (candidate.placed) stats.candidatePlaced += 1;
  }
}

function finalizeStats(stats) {
  return {
    ...stats,
    primaryWinRate: stats.primaryPicks ? (stats.primaryWins / stats.primaryPicks) * 100 : 0,
    primaryPlaceRate: stats.primaryPicks ? (stats.primaryPlaced / stats.primaryPicks) * 100 : 0,
    candidateWinRate: stats.candidatePicks ? (stats.candidateWins / stats.candidatePicks) * 100 : 0,
    candidatePlaceRate: stats.candidatePicks ? (stats.candidatePlaced / stats.candidatePicks) * 100 : 0,
  };
}

function buildReport(days) {
  const dayReports = days.map(analyzeDay);
  const stats = blankStats();
  const skipped = [];
  for (const day of dayReports) {
    if (day.skipped) {
      skipped.push(day);
      continue;
    }
    for (const race of day.races) {
      stats.races += 1;
      addStats(stats, race.candidates);
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    version: VERSION,
    policy: {
      oddsUsed: false,
      basis: 'Pro model rank/probability from backtest-v6, with hot-signal penalty. Current odds are not used.',
      formula: 'coldPotentialScore = proDataScore - heatPenalty',
      ...POLICY,
    },
    days,
    skipped,
    summary: finalizeStats(stats),
    dayReports,
  };
}

function printReport(report) {
  console.log(`\n=== ${VERSION} ===`);
  console.log(`Days: ${report.days.join(', ')}`);
  console.log(
    `Races: ${report.summary.races} | Primary placed: ${report.summary.primaryPlaced}/${report.summary.primaryPicks} (${report.summary.primaryPlaceRate.toFixed(1)}%) | Primary wins: ${report.summary.primaryWins}`,
  );

  for (const day of report.dayReports) {
    if (day.skipped) {
      console.log(`${day.date}: skipped (${day.reason})`);
      continue;
    }
    console.log(`\n${day.date} ${day.venue}`);
    for (const race of day.races) {
      const picks = race.candidates.map((candidate, index) => {
        const tag = index === 0 ? '*' : ' ';
        const ranks = ['Pro', 'V6', 'V8', 'V9']
          .map((model) => `${model}:${candidate.modelComparison[model]?.rank ?? '-'}`)
          .join(' ');
        return `${tag}#${candidate.no} ${candidate.name} score ${candidate.coldPotentialScore.toFixed(4)} ${candidate.selectionTier} result ${candidate.resultRaw || '-'} [${ranks}]`;
      });
      console.log(`R${race.raceNo} ${race.distance || '-'}m: ${picks.join(' | ')}`);
    }
  }
}

function run() {
  const days = daysFromEnv();
  const report = buildReport(days);
  const output = process.env.OUTPUT || (days.length === 1 ? `pro-cold-potential-v1-${days[0]}.json` : 'pro-cold-potential-v1-report.json');
  fs.writeFileSync(output, JSON.stringify(report, null, 2), 'utf8');
  printReport(report);
  console.log(`\nWritten: ${output}`);
}

if (require.main === module) run();

module.exports = {
  buildReport,
  analyzeDay,
  proDataScore,
  heatPenalty,
};
