// model-v17.js
// V17 = V15.1 + Rating Delta gate + LBW gate
//
// 新發現：
//   • V15.1 推介嘅馬，如果上次 比賽 race rating 比 5 場前升 ≥ 2 分（trainer 信任增）= 強信號
//   • V15.1 推介嘅馬，如果最近一場 LBW（落敗距離）≤ 2 馬位 = 跑近頭幾名 = 狀態好
//
// 樣本表現（2024-01-07 至 2026-05-17）：
//   V15.1 baseline                : 737 場 / 連贏單注 +92.2% / 連贏膽拖 +28.7%
//   V17-A (rating ≥ 2)           : 387 場 / 單注 +155.8% / 膽拖 +46.1% ★
//   V17-B (rating ≥ 2 + lbw ≤ 2) : 274 場 / 單注 +166.1% / 膽拖 +55.1% ★
//   V17-C (rating ≥ 2 + avgLBW3 ≤ 3): 365 場 / 單注 +165.2% / 膽拖 +51.8% ★
//
// 三年表現（V17-A）：2024 +151% / 2025 +130% / 2026 +211%
//   ★ V15.1 base 嘅 2025 +50% → V17 +130%（最大改善）
//
// 唔成功嘅嘗試：
//   • classDrop（不升班）：負信號 —V15.1 winning races 多數係升班場
//   • trainer 30d streak：trainerEntries 樣本太細（78 trainer）冇統計 power
//
// 用法：
//   node model-v17.js                  # 全部 results
//   node model-v17.js 2026-05-21       # 指定日

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

// ===== 工具 =====
function parsePlace(p) {
  const n = parseInt(String(p||'').replace(/^0+/,''),10);
  return Number.isFinite(n) ? n : null;
}
function parseDateDMY(v) {
  const m = String(v||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const yr = m[3].length === 4 ? Number(m[3]) : 2000 + Number(m[3]);
  return new Date(Date.UTC(yr, Number(m[2])-1, Number(m[1])));
}
function num(v) {
  const n = Number(String(v||'').replace(/[^0-9.\-]/g,''));
  return Number.isFinite(n) ? n : 0;
}
function parseLBW(v) {
  if (!v) return 0;
  const s = String(v).trim();
  if (s === 'N') return 0.05;
  if (s === 'SH') return 0.1;
  if (s === 'HD') return 0.2;
  if (/^[\d./-]+$/.test(s)) {
    let total = 0;
    for (const part of s.split('-')) {
      if (/^\d+\/\d+$/.test(part)) {
        const [a,b] = part.split('/').map(Number);
        total += a/b;
      } else if (/^\d+$/.test(part)) total += Number(part);
    }
    return total;
  }
  return 0;
}

// ===== Score features =====
function distAvgPlace(history, raceDist) {
  const matches = history.filter(r => {
    const d = num(r.distance);
    return d > 0 && Math.abs(d - raceDist) <= 100;
  });
  const places = matches.map(r => parsePlace(r.place)).filter(p => p);
  return places.length ? places.reduce((a,b)=>a+b,0)/places.length : null;
}
function last6Score(history) {
  const last6 = history.slice(0, 6);
  const places = last6.map(r => parsePlace(r.place)).filter(p => p);
  return {
    last6Avg: places.length ? places.reduce((a,b)=>a+b,0)/places.length : null,
    lastPlace: parsePlace(history[0]?.place),
  };
}
function freshnessDays(history, raceDate) {
  if (!history.length) return null;
  const last = parseDateDMY(history[0].date);
  if (!last) return null;
  return Math.round((raceDate - last) / 86400000);
}
function ratingDelta(history) {
  if (!history.length) return 0;
  const lastRating = num(history[0].rating);
  const oldRating = history.length >= 5 ? num(history[4].rating) : lastRating;
  return lastRating - oldRating;
}
function lastLBW(history) {
  return history.length ? parseLBW(history[0].lbw) : 99;
}
function avgLBW3(history) {
  const last3 = history.slice(0, 3);
  if (!last3.length) return 99;
  return last3.reduce((s, r) => s + parseLBW(r.lbw), 0) / last3.length;
}

function scoreRunner(horse, raceDate, raceDist) {
  const history = (horse.records || []).filter(r => {
    const dt = parseDateDMY(r.date);
    return dt && dt < raceDate;
  });
  const dap = distAvgPlace(history, raceDist);
  const l6 = last6Score(history);
  const days = freshnessDays(history, raceDate);
  // Score fallback chain：dap → last6Avg → lastPlace → 99（避免冇 dap 時全部馬 tied 99 → leakage）
  const score = dap ?? l6.last6Avg ?? l6.lastPlace ?? 99;
  return {
    distAvgPlace: dap,
    last6Avg: l6.last6Avg,
    lastPlace: l6.lastPlace,
    days,
    ratingDelta: ratingDelta(history),
    last1lbw: lastLBW(history),
    avgLBW3: avgLBW3(history),
    historyCount: history.length,
    score,
  };
}

// ===== Gate =====
const POLICY = {
  // V15.1 base
  daysMin: 7,
  daysMax: 35,
  last6AvgMax: 4,
  // V17 加
  ratingDeltaMin: 2,        // Tier A: rating 升 ≥ 2 分
  // Optional Tier B (V17-B):
  last1LBWMax: 2,
  // Optional Tier C (V17-C):
  avgLBW3Max: 3,
};

function passesGateA(top1Score) {
  // Tier A：V15.1 + ratingDelta ≥ 2
  if (!top1Score) return false;
  if (top1Score.days != null && (top1Score.days < POLICY.daysMin || top1Score.days > POLICY.daysMax)) return false;
  if ((top1Score.last6Avg ?? 99) > POLICY.last6AvgMax) return false;
  if ((top1Score.ratingDelta ?? -99) < POLICY.ratingDeltaMin) return false;
  return true;
}

function passesGateB(top1Score) {
  // Tier B：A + last1 lbw ≤ 2
  if (!passesGateA(top1Score)) return false;
  if ((top1Score.last1lbw ?? 99) > POLICY.last1LBWMax) return false;
  return true;
}

function passesGateC(top1Score) {
  // Tier C：A + avgLBW3 ≤ 3
  if (!passesGateA(top1Score)) return false;
  if ((top1Score.avgLBW3 ?? 99) > POLICY.avgLBW3Max) return false;
  return true;
}

// ===== Backtest entry =====
const HORSES_FILES = [
  'horses-all.json','horses-janmar.json','horses-apr5days.json',
  'horses-3days.json','horses-2026-05-09.json','horses-2026-05-17.json',
  'horses-513-missing.json',
];
const horseByCode = new Map();
for (const fn of HORSES_FILES) {
  const fp = path.join(paths.DIRS.horses, fn);
  if (!fs.existsSync(fp)) continue;
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  for (const h of data.horses || []) {
    if (!horseByCode.has(h.code) || (h.records?.length || 0) > (horseByCode.get(h.code).records?.length || 0)) {
      horseByCode.set(h.code, h);
    }
  }
}

function processDate(date) {
  const resPath = paths.resultsFullPath(date);
  if (!fs.existsSync(resPath)) return null;
  const resultsData = JSON.parse(fs.readFileSync(resPath,'utf8'));
  const raceDate = new Date(date + 'T00:00:00+08:00');

  const races = (resultsData.races || []).map(race => {
    const meta = race.meta || {};
    const dist = num(meta.distance);
    const runners = race.runners || [];
    if (!runners.length) {
      return { raceNo: race.raceNo, meta, v17Ranking: [], actualTop3: [] };
    }
    const enriched = runners.map(r => {
      const horse = horseByCode.get(r.code);
      if (!horse) return null;
      const sc = scoreRunner(horse, raceDate, dist);
      return {
        no: String(r.no), name: r.name, code: r.code,
        jockey: r.jockey, trainer: r.trainer,
        draw: num(r.draw),
        ...sc,
      };
    }).filter(Boolean);

    // tie-breaker：score 同分時用 ratingDelta（高優先），再 fallback 用 historyCount
    // 避免依賴 runners array 嘅 plc-sorted 原 order（會 leak 答案）
    const ranking = [...enriched].sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if ((b.ratingDelta ?? -99) !== (a.ratingDelta ?? -99)) return (b.ratingDelta ?? -99) - (a.ratingDelta ?? -99);
      return (b.historyCount ?? 0) - (a.historyCount ?? 0);
    });

    const finished = runners
      .filter(r => /^\d+$/.test(r.plc))
      .sort((a,b) => parseInt(a.plc,10) - parseInt(b.plc,10))
      .slice(0,3)
      .map(r => String(r.no));

    const top1 = ranking[0];
    const tierA = ranking.length >= 3 && passesGateA(top1);
    const tierB = tierA && passesGateB(top1);
    const tierC = tierA && passesGateC(top1);

    let action = 'skip';
    let tier = null;
    const reasons = [];
    const riskFlags = [];
    if (tierB) { action = 'play-strong'; tier = 'B'; }
    else if (tierC) { action = 'play-banker'; tier = 'C'; }
    else if (tierA) { action = 'play-banker'; tier = 'A'; }

    if (tier && top1) {
      reasons.push(
        `tier-${tier}`,
        `distAvg=${top1.distAvgPlace?.toFixed(2) ?? 'n/a'}`,
        `last6Avg=${top1.last6Avg?.toFixed(2) ?? 'n/a'}`,
        `days=${top1.days ?? 'n/a'}`,
        `ratingDelta=${top1.ratingDelta}`,
        `last1lbw=${top1.last1lbw.toFixed(2)}`,
        `avgLBW3=${top1.avgLBW3.toFixed(2)}`,
      );
    } else if (top1) {
      if (top1.days != null && (top1.days < POLICY.daysMin || top1.days > POLICY.daysMax)) riskFlags.push(`days-out:${top1.days}`);
      if ((top1.last6Avg ?? 99) > POLICY.last6AvgMax) riskFlags.push(`last6Avg=${top1.last6Avg?.toFixed(2)}`);
      if ((top1.ratingDelta ?? -99) < POLICY.ratingDeltaMin) riskFlags.push(`ratingDelta=${top1.ratingDelta}`);
    }

    return {
      raceNo: race.raceNo,
      meta,
      v17Ranking: ranking.map((r, i) => ({
        rank: i+1, no: r.no, name: r.name,
        distAvgPlace: r.distAvgPlace,
        last6Avg: r.last6Avg,
        days: r.days,
        ratingDelta: r.ratingDelta,
        last1lbw: r.last1lbw,
        avgLBW3: r.avgLBW3,
        historyCount: r.historyCount,
      })),
      v17Top3: ranking.slice(0,3).map(r => r.no),
      recommendations: { action, tier, reasons, riskFlags },
      recommend: tierA ? {
        tier,
        qinT12: { combo: `${ranking[0].no},${ranking[1].no}`, label: `${ranking[0].no}-${ranking[1].no}` },
        qinBanker: [
          { combo: `${ranking[0].no},${ranking[1].no}`, label: `${ranking[0].no}-${ranking[1].no}` },
          { combo: `${ranking[0].no},${ranking[2].no}`, label: `${ranking[0].no}-${ranking[2].no}` },
        ],
      } : null,
      actualTop3: finished,
    };
  });

  return {
    date,
    venue: resultsData.venue || '',
    model: 'v17-distance-rating-lbw',
    policy: POLICY,
    races,
  };
}

function main() {
  const args = process.argv.slice(2);
  let dates = [];
  if (args.length) dates = args;
  else {
    for (const yr of ['2024','2025','2026']) {
      const dir = path.join(paths.DIRS.results, yr);
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        const m = f.match(/(\d{4}-\d{2}-\d{2})/);
        if (m) dates.push(m[1]);
      }
    }
    dates.sort();
  }
  let totalRaces = 0, totalA = 0, totalB = 0, totalC = 0;
  for (const date of dates) {
    const out = processDate(date);
    if (!out) continue;
    totalRaces += out.races.length;
    totalA += out.races.filter(r => r.recommendations?.tier).length;
    totalB += out.races.filter(r => r.recommendations?.tier === 'B').length;
    totalC += out.races.filter(r => r.recommendations?.tier === 'C').length;
    fs.writeFileSync(paths.backtestWritePath('v17', date), JSON.stringify(out, null, 2), 'utf8');
  }
  console.log(`V17 done: ${dates.length} 日 / ${totalRaces} 場 / ${totalA} tier A play / ${totalB} tier B / ${totalC} tier C → data/backtest/v17/`);
}

if (require.main === module) main();
module.exports = { processDate, scoreRunner, passesGateA, passesGateB, passesGateC };
