// model-v16.js
// V16 = V15.1 (distance track record + active gate) + Trackwork features
//
// 新加 features：
//   1. gallopRecency  : 上次「快操」距 race date 嘅日數（理想 3-7 日）
//   2. gallopSpeed    : 最近 1-3 次快操嘅平均最後 split（細 = 快）
//   3. trialPlace     : 最近 60 日嘅 試閘 名次（如有）
//   4. canterFreq14d  : 過去 14 日 嘅 踱步 + 馬場活動 次數
//
// 評分機制：唔覆寫 V15.1 嘅核心 ranking（dist avg place），
//          只係加多兩個 boost / penalty：
//   • Top1 嘅 trackwork 質量好 → score boost
//   • Top1 嘅 trackwork 不活躍 → 落注前 skip
//
// 注意：trackwork data 唔齊全（只 active 馬有），冇 trackwork = 唔加分／不扣分

const fs = require('fs');
const path = require('path');
const paths = require('./paths');
const v151 = require('./model-v15');

const TRACKWORK_DIR = path.join(paths.DIRS.results, '../trackwork');

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

// 解析快操 detail：「27.7 23.4 (51.1) (助手)」→ { splits: [27.7, 23.4], total: 51.1 }
function parseGallopDetail(detail) {
  if (!detail) return null;
  const m = detail.match(/^([\d.\s]+?)\s*\(([\d.:]+)\)/);
  if (!m) return null;
  const splits = m[1].trim().split(/\s+/).map(Number).filter(Number.isFinite);
  const totalRaw = m[2];
  let total = 0;
  if (totalRaw.includes(':')) {
    const [m2, s] = totalRaw.split(':');
    total = Number(m2)*60 + Number(s);
  } else {
    const parts = totalRaw.split('.');
    if (parts.length === 3) total = Number(parts[0])*60 + Number(parts[1]) + Number(parts[2])/100;
    else total = Number(totalRaw);
  }
  return { splits, total, lastSplit: splits[splits.length - 1] };
}

// 解析試閘：「第4組 (呂聖澤) 1000M 巴閉哥 13.8 21.8 23.6 (0.59.23)」
function parseTrialDetail(detail) {
  if (!detail) return null;
  const placeMatch = detail.match(/(\d+)\/(\d+)/);
  if (placeMatch) return { place: Number(placeMatch[1]), fieldSize: Number(placeMatch[2]) };
  return null;
}

// 載 trackwork by code
const trackworkByCode = new Map();
if (fs.existsSync(TRACKWORK_DIR)) {
  for (const f of fs.readdirSync(TRACKWORK_DIR)) {
    if (!f.endsWith('.json')) continue;
    try {
      const data = JSON.parse(fs.readFileSync(path.join(TRACKWORK_DIR, f), 'utf8'));
      if (data.records?.length > 0) trackworkByCode.set(data.code, data);
    } catch(e) {}
  }
}
console.log(`Loaded trackwork for ${trackworkByCode.size} horses`);

function trackworkFeatures(code, raceDate) {
  const tw = trackworkByCode.get(code);
  if (!tw) return null;
  const recsBefore = tw.records.filter(r => {
    const d = parseDateDMY(r.date);
    return d && d < raceDate;
  });
  if (!recsBefore.length) return null;

  // 1. 上次快操距 race 嘅日數
  const gallopList = recsBefore.filter(r => r.type === '快操');
  const lastGallop = gallopList[0];  // 已經按日期 desc
  const gallopRecency = lastGallop ? Math.round((raceDate - parseDateDMY(lastGallop.date)) / 86400000) : null;

  // 2. 最近 3 次快操嘅 lastSplit 平均（細 = 快）
  const recentGallops = gallopList.slice(0, 3).map(r => parseGallopDetail(r.detail)).filter(Boolean);
  const avgLastSplit = recentGallops.length ? recentGallops.reduce((s,g)=>s+(g.lastSplit||30),0)/recentGallops.length : null;

  // 3. 最近 60 日 試閘 名次
  const sixtyDaysAgo = new Date(raceDate.getTime() - 60*86400000);
  const recentTrials = recsBefore.filter(r => r.type === '試閘' && parseDateDMY(r.date) >= sixtyDaysAgo);
  const trialPlace = recentTrials.length ? parseTrialDetail(recentTrials[0].detail)?.place : null;

  // 4. 過去 14 日活動量（踱步 + 馬場 + 游水 + 快操）
  const fourteenDaysAgo = new Date(raceDate.getTime() - 14*86400000);
  const recentActivity = recsBefore.filter(r => parseDateDMY(r.date) >= fourteenDaysAgo);
  const activity14d = recentActivity.length;

  return {
    gallopRecency,
    avgLastSplit,
    trialPlace,
    activity14d,
    hasData: true,
  };
}

// V16 gate：V15.1 base + trackwork checks
function passesV16Gate(top1Score, top1Code, raceDate) {
  // 先過 V15.1 gate（days 7-35 + last6Avg ≤ 4）
  if (!v151.passesGate(top1Score)) return { pass: false, reason: 'v15.1-gate-fail' };
  // 加 trackwork check（only if available）
  const tw = trackworkFeatures(top1Code, raceDate);
  if (!tw || !tw.hasData) return { pass: true, reason: 'no-trackwork-data', tw: null };
  // gallopRecency 3-10 日 = good signal
  if (tw.gallopRecency != null && (tw.gallopRecency < 3 || tw.gallopRecency > 21)) {
    return { pass: false, reason: `gallop-recency:${tw.gallopRecency}d` };
  }
  // activity14d ≥ 5（trainer 重視）
  if (tw.activity14d < 5) return { pass: false, reason: `low-activity:${tw.activity14d}` };
  return { pass: true, reason: 'v16-pass', tw };
}

function processDate(date) {
  const v15Out = v151.processDate(date);
  if (!v15Out) return null;
  const raceDate = new Date(date + 'T00:00:00+08:00');

  // 對每場 race，再過 V16 gate
  const races = v15Out.races.map(race => {
    if (!race.recommend || !race.v15Ranking?.length) return race;
    const top1 = race.v15Ranking[0];
    const top1Code = race.v15Ranking[0]?.code;  // V15 唔包 code，要 inject
    // V15 ranking 入面 用 no/name/distAvgPlace 等，但冇 code。要 cross ref
    return race;  // 暫保留，等 v15 加 code field
  });

  return {
    ...v15Out,
    model: 'v16-with-trackwork',
    races,
  };
}

if (require.main === module) {
  console.log('V16 ready (after scraper finishes).');
  console.log('Trackwork data loaded:', trackworkByCode.size, 'horses');
}

module.exports = { trackworkFeatures, passesV16Gate, processDate, trackworkByCode };
