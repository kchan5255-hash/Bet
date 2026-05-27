// detect-race-day.js
// 自動偵測：
//   1. 今日係咪賽馬日（爬 HKJC GraphQL fixture，並行查 ST + HV）
//   2. 邊啲場 postTime + 5min ≤ now() 而且仲未爬（race_results table 冇）
//   3. 係咪最後一場（觸發 export V19 + history rebuild）
//
// 輸出（GitHub Actions $GITHUB_OUTPUT）：
//   race_day=true|false
//   date=2026-05-24
//   venue=ST|HV
//   races_to_fetch=3,4,5    （新增加待爬場次，逗號分隔；空字串代表無新嘢做）
//   max_race_no=5           （scraper 由 R1 跑到呢場；包括已爬嘅場 — 覆寫 idempotent）
//   total_races=11          （當日總場數）
//   is_last_race=true|false （爬完今次後係咪所有場齊備）
//
// 用法：
//   node detect-race-day.js                              # 用今日（HKT）
//   DATE_OVERRIDE=2026-05-24 node detect-race-day.js     # 測試指定日

const fs = require('fs');
const path = require('path');

const ENDPOINT = 'https://info.cld.hkjc.com/graphql/base/';
const QUERY_FILE = path.join(__dirname, '.graphql-query-cache.txt');
const POST_BUFFER_MIN = parseInt(process.env.POST_BUFFER_MIN || '5', 10);
const TARGET = (process.env.TARGET || 'today').toLowerCase(); // today | tomorrow

// HKT (UTC+8) 今日；offset=1 = 明日，依此類推
function dateHKT(offsetDays = 0) {
  const now = new Date();
  const hkt = new Date(now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60_000);
  hkt.setUTCDate(hkt.getUTCDate() + offsetDays);
  return hkt.toISOString().slice(0, 10);
}

const DATE = process.env.DATE_OVERRIDE
  || (TARGET === 'tomorrow' ? dateHKT(1) : dateHKT(0));

function setOutput(key, value) {
  const line = `${key}=${value}\n`;
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, line);
  }
  process.stdout.write(line);
}

async function fetchMeeting(venueCode) {
  if (!fs.existsSync(QUERY_FILE)) {
    throw new Error(`Missing ${QUERY_FILE}; run scrape-racecard-multi.js once to seed it`);
  }
  const QUERY = fs.readFileSync(QUERY_FILE, 'utf8');
  const body = {
    operationName: 'raceMeetings',
    variables: { date: DATE, venueCode },
    query: QUERY,
  };
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        'Origin': 'https://bet.hkjc.com',
        'Referer': 'https://bet.hkjc.com/',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(`fetch ${venueCode} failed: ${err.message}`);
    return null;
  }
  if (!res.ok) {
    console.error(`fetch ${venueCode} HTTP ${res.status}`);
    return null;
  }
  let json;
  try { json = await res.json(); } catch { return null; }
  const meetings = json?.data?.raceMeetings;
  if (!Array.isArray(meetings) || !meetings.length) return null;
  const m = meetings[0];
  // 過濾：只要本地賽事（ST/HV + meetingType='D'），唔要海外賽（venueCode='S1', meetingType='O'）
  if (m.venueCode !== 'ST' && m.venueCode !== 'HV') return null;
  if (m.meetingType && m.meetingType !== 'D' && m.meetingType !== 'N') return null;
  if (m.date !== DATE) return null; // HKJC 有時返回最近賽事，唔係查嘅日期
  return m;
}

async function loadFetchedRaceNos(date) {
  if (process.env.USE_SUPABASE !== '1') return new Set();
  try {
    const { loadResultRaceNos } = require('./supabase-data');
    return await loadResultRaceNos(date);
  } catch (err) {
    console.warn(`Supabase loadResultRaceNos failed: ${err.message}, fall back to JSON`);
  }
  // Fallback：讀 web/src/data/race-results-by-date.json
  try {
    const file = path.join(__dirname, 'web', 'src', 'data', 'race-results-by-date.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const day = (data.byDate || {})[date];
    if (!day) return new Set();
    return new Set((day.races || []).map((r) => Number(r.raceNo)));
  } catch {
    return new Set();
  }
}

(async () => {
  // 1. 並行查 ST + HV
  const [st, hv] = await Promise.all([fetchMeeting('ST'), fetchMeeting('HV')]);
  const meeting = st || hv;

  if (!meeting) {
    console.log(`${DATE}: 無 raceMeetings (ST + HV 都冇)，非比賽日`);
    setOutput('race_day', 'false');
    setOutput('date', DATE);
    setOutput('venue', '');
    setOutput('races_to_fetch', '');
    setOutput('max_race_no', '');
    setOutput('total_races', '');
    setOutput('is_last_race', 'false');
    return;
  }

  const venue = meeting.venueCode;
  const races = meeting.races || [];
  const totalRaces = meeting.totalNumberOfRace || races.length;
  console.log(`${DATE} ${venue}: 比賽日，共 ${totalRaces} 場`);

  // 2. 讀已爬場次
  const fetched = await loadFetchedRaceNos(DATE);
  console.log(`已爬：${[...fetched].sort((a, b) => a - b).join(',') || '(無)'}`);

  // 3. 比對 postTime + buffer ≤ now()
  const now = Date.now();
  const bufferMs = POST_BUFFER_MIN * 60_000;
  const toFetch = [];
  for (const r of races) {
    const raceNo = Number(r.no);
    if (fetched.has(raceNo)) continue;
    if (!r.postTime) continue;
    const postT = new Date(r.postTime).getTime();
    if (Number.isNaN(postT)) continue;
    if (postT + bufferMs <= now) {
      toFetch.push(raceNo);
    }
  }
  toFetch.sort((a, b) => a - b);

  // 4. 是否最後一場？（爬完之後 fetched ∪ toFetch 蓋齊 totalRaces）
  const willBeFetched = new Set([...fetched, ...toFetch]);
  const isLastRace = toFetch.length > 0 && willBeFetched.size >= totalRaces;
  const maxRaceNo = toFetch.length ? Math.max(...willBeFetched) : 0;

  console.log(`待爬：${toFetch.join(',') || '(無)'}  max=${maxRaceNo}  ${isLastRace ? '(最後一輪)' : ''}`);

  setOutput('race_day', 'true');
  setOutput('date', DATE);
  setOutput('venue', venue);
  setOutput('races_to_fetch', toFetch.join(','));
  setOutput('max_race_no', String(maxRaceNo));
  setOutput('total_races', String(totalRaces));
  setOutput('is_last_race', String(isLastRace));
})().catch((err) => {
  console.error(err);
  setOutput('race_day', 'false');
  setOutput('date', DATE);
  setOutput('venue', '');
  setOutput('races_to_fetch', '');
  setOutput('max_race_no', '');
  setOutput('total_races', '');
  setOutput('is_last_race', 'false');
  process.exit(1);
});
