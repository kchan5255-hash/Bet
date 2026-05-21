// model-v15.js (V15.1)
// V15.1 = Distance Track Record + Activity Filter
//
// 改良目標：
//   原 V15 base 中獎率 9.8%，靠 lottery 大冷彩。
//   V15.1 加 2 個 filter 篩走「不活躍／長期離場」嘅馬：
//     • Top1 上次出賽 7-35 日（避免太 fresh / 太 rusty）
//     • Top1 最近 6 場平均名次 ≤ 4（近期狀態唔差）
//
// 樣本表現（2024-01-07 至 2026-05-17，737 場）：
//   • 連贏單注 ROI +92.2% / 中獎率 11.4% / 三年正 (+104% / +50% / +142%)
//   • 連贏膽拖 ROI +28.7% / 中獎率 15.6% / 三年正 (+21% / +26% / +51%)
//
// 流轉細 base 一半、中獎率高、三年穩。
//
// 唔同 V15 base 之處：
//   - V15 base：1934 場、ROI +109%、靠少數大冷彩
//   - V15.1：737 場、ROI +92%、分佈更穩
//
// 用法：
//   node model-v15.js                    # 跑全部 results
//   node model-v15.js 2026-05-21          # 指定日子

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

// ===== Score features =====

function distanceTrackRecord(history, targetDist) {
  const matches = history.filter(r => {
    const d = num(r.distance);
    return d > 0 && Math.abs(d - targetDist) <= 100;
  });
  const places = matches.map(r => parsePlace(r.place)).filter(p => p);
  return {
    distAvgPlace: places.length ? places.reduce((a,b)=>a+b,0)/places.length : null,
    distSampleSize: places.length,
  };
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

function scoreRunner(horse, raceDate, raceDist) {
  const history = (horse.records || []).filter(r => {
    const dt = parseDateDMY(r.date);
    return dt && dt < raceDate;
  });
  const dtr = distanceTrackRecord(history, raceDist);
  const last6 = last6Score(history);
  const days = freshnessDays(history, raceDate);
  return {
    distAvgPlace: dtr.distAvgPlace,
    distSampleSize: dtr.distSampleSize,
    last6Avg: last6.last6Avg,
    lastPlace: last6.lastPlace,
    days,
    historyCount: history.length,
    score: dtr.distAvgPlace ?? last6.last6Avg ?? last6.lastPlace ?? 99,
  };
}

// V15.1 gate
function passesGate(top1Score) {
  if (!top1Score) return false;
  // days 7-35（如果有 history）
  if (top1Score.days != null && (top1Score.days < 7 || top1Score.days > 35)) return false;
  // last6Avg ≤ 4
  if ((top1Score.last6Avg ?? 99) > 4) return false;
  return true;
}

// ===== Backtest =====

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
      return { raceNo: race.raceNo, meta, v15Ranking: [], v15Top3: [], actualTop3: [] };
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

    // tie-breaker：score 同分時用 historyCount 高嘅優先；避免依賴 runners array 原 plc 排序（leak 答案）
    const ranking = [...enriched].sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return (b.historyCount ?? 0) - (a.historyCount ?? 0);
    });

    const finished = runners
      .filter(r => /^\d+$/.test(r.plc))
      .sort((a,b) => parseInt(a.plc,10) - parseInt(b.plc,10))
      .slice(0,3)
      .map(r => String(r.no));

    const top1Score = ranking[0];
    const gatePass = ranking.length >= 3 && passesGate(top1Score);
    const reasons = [];
    const riskFlags = [];
    if (gatePass) {
      reasons.push(`distAvg=${top1Score.distAvgPlace?.toFixed(2) ?? 'n/a'}`);
      reasons.push(`last6Avg=${top1Score.last6Avg?.toFixed(2) ?? 'n/a'}`);
      reasons.push(`days=${top1Score.days ?? 'n/a'}`);
    } else if (ranking.length >= 3) {
      if (top1Score.days != null && (top1Score.days < 7 || top1Score.days > 35)) riskFlags.push(`days-out:${top1Score.days}`);
      if ((top1Score.last6Avg ?? 99) > 4) riskFlags.push(`last6Avg=${top1Score.last6Avg?.toFixed(2)}`);
    }

    return {
      raceNo: race.raceNo,
      meta,
      v15Ranking: ranking.map((r, i) => ({
        rank: i+1, no: r.no, name: r.name,
        distAvgPlace: r.distAvgPlace,
        distSampleSize: r.distSampleSize,
        last6Avg: r.last6Avg,
        lastPlace: r.lastPlace,
        days: r.days,
        historyCount: r.historyCount,
      })),
      v15Top3: ranking.slice(0,3).map(r => r.no),
      recommendations: {
        action: gatePass ? 'play' : 'skip',
        reasons,
        riskFlags,
      },
      recommend: gatePass ? {
        tier: 'banker',
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
    model: 'v15.1-distance-record-active',
    policy: {
      rule: 'rank by avg place at same distance ±100m, gate: Top1 days 7-35 + last6 avg place ≤ 4',
    },
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
  let totalRaces = 0, totalPlay = 0;
  for (const date of dates) {
    const out = processDate(date);
    if (!out) continue;
    totalRaces += out.races.length;
    totalPlay += out.races.filter(r => r.recommendations?.action === 'play').length;
    fs.writeFileSync(paths.backtestWritePath('v15', date), JSON.stringify(out, null, 2), 'utf8');
  }
  console.log(`V15.1 done: ${dates.length} 日 / ${totalRaces} 場 / ${totalPlay} 場 play → data/backtest/v15/`);
}

if (require.main === module) main();
module.exports = { processDate, scoreRunner, passesGate };
