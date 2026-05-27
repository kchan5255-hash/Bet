// detect-odds-window.js
// 為 odds-refresh workflow 偵測：
//   1. 今日係咪賽馬日（爬 HKJC GraphQL fixture，並行查 ST + HV）
//   2. 邊啲場 postTime - PRE_WINDOW_MIN ≤ now < postTime + POST_CUTOFF_MIN（落入賠率刷新窗口）
//
// 同 detect-race-day.js 嘅分別：
//   detect-race-day → 已開閘且未爬嘅場（用嚟跑 results-scraper / dividends-scraper）
//   detect-odds-window → 即將開閘但仲未開閘嘅場（用嚟刷新賠率）
//
// 輸出（GitHub Actions $GITHUB_OUTPUT）：
//   in_window=true|false
//   date=2026-05-24
//   venue=ST|HV
//   races_in_window=3,4,5    （CSV，empty = 唔需要做）
//   total_races=11
//
// 環境變數：
//   PRE_WINDOW_MIN     開閘前幾多分鐘開始爬（default 30）
//   POST_CUTOFF_MIN    開閘後幾多分鐘停爬（default 1）
//   DATE_OVERRIDE      覆寫日期（YYYY-MM-DD），default 今日 HKT
//
// 用法：
//   node detect-odds-window.js
//   PRE_WINDOW_MIN=60 DATE_OVERRIDE=2026-05-24 node detect-odds-window.js

const fs = require('fs');
const path = require('path');

const ENDPOINT = 'https://info.cld.hkjc.com/graphql/base/';
const QUERY_FILE = path.join(__dirname, '.graphql-query-cache.txt');
const PRE_WINDOW_MIN = parseInt(process.env.PRE_WINDOW_MIN || '30', 10);
const POST_CUTOFF_MIN = parseInt(process.env.POST_CUTOFF_MIN || '1', 10);

function dateHKT(offsetDays = 0) {
  const now = new Date();
  const hkt = new Date(now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60_000);
  hkt.setUTCDate(hkt.getUTCDate() + offsetDays);
  return hkt.toISOString().slice(0, 10);
}

const DATE = process.env.DATE_OVERRIDE || dateHKT(0);

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
  if (m.venueCode !== 'ST' && m.venueCode !== 'HV') return null;
  if (m.meetingType && m.meetingType !== 'D' && m.meetingType !== 'N') return null;
  if (m.date !== DATE) return null;
  return m;
}

(async () => {
  const [st, hv] = await Promise.all([fetchMeeting('ST'), fetchMeeting('HV')]);
  const meeting = st || hv;

  if (!meeting) {
    console.log(`${DATE}: 無 raceMeetings (ST + HV 都冇)，非比賽日`);
    setOutput('in_window', 'false');
    setOutput('date', DATE);
    setOutput('venue', '');
    setOutput('races_in_window', '');
    setOutput('total_races', '');
    return;
  }

  const venue = meeting.venueCode;
  const races = meeting.races || [];
  const totalRaces = meeting.totalNumberOfRace || races.length;
  console.log(`${DATE} ${venue}: 比賽日，共 ${totalRaces} 場（PRE=${PRE_WINDOW_MIN}min POST=${POST_CUTOFF_MIN}min）`);

  const now = Date.now();
  const preMs = PRE_WINDOW_MIN * 60_000;
  const postMs = POST_CUTOFF_MIN * 60_000;
  const inWindow = [];
  for (const r of races) {
    const raceNo = Number(r.no);
    if (!r.postTime) continue;
    const postT = new Date(r.postTime).getTime();
    if (Number.isNaN(postT)) continue;
    if (postT - preMs <= now && now < postT + postMs) {
      inWindow.push(raceNo);
    }
  }
  inWindow.sort((a, b) => a - b);

  console.log(`窗口內：${inWindow.join(',') || '(無)'}`);

  setOutput('in_window', String(inWindow.length > 0));
  setOutput('date', DATE);
  setOutput('venue', venue);
  setOutput('races_in_window', inWindow.join(','));
  setOutput('total_races', String(totalRaces));
})().catch((err) => {
  console.error(err);
  setOutput('in_window', 'false');
  setOutput('date', DATE);
  setOutput('venue', '');
  setOutput('races_in_window', '');
  setOutput('total_races', '');
  process.exit(1);
});
