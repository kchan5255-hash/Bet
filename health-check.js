// health-check.js
// 驗證資料完整性：對比 fixture 同實際資料
//
// 檢查項：
//   1. analysis-by-date.json 有該日 + 場數一致
//   2. race-results-by-date.json 有該日 + 場數一致
//   3. dividends-by-date.json 有該日 + 場數一致
//   4. v19.json 有該日 + 場數一致
//   5. v9-results.json 有該日 + 場數一致
//   6. Supabase v19_predictions 有該日 + 場數一致
//   7. Supabase race_results 有該日 row
//
// 用法：
//   node health-check.js                           # 檢查昨日 HKT
//   DATE_OVERRIDE=2026-05-24 node health-check.js  # 檢查指定日

const fs = require('fs');
const path = require('path');

const WEB_DATA_DIR = path.join(__dirname, 'web', 'src', 'data');
const ENDPOINT = 'https://info.cld.hkjc.com/graphql/base/';
const QUERY_FILE = path.join(__dirname, '.graphql-query-cache.txt');

function dateHKT(offsetDays = 0) {
  const now = new Date();
  const hkt = new Date(now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60_000);
  hkt.setUTCDate(hkt.getUTCDate() + offsetDays);
  return hkt.toISOString().slice(0, 10);
}

const DATE = process.env.DATE_OVERRIDE || dateHKT(-1); // 預設檢查昨日

function setOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

async function fetchFixtureCount(date) {
  if (!fs.existsSync(QUERY_FILE)) return null;
  const QUERY = fs.readFileSync(QUERY_FILE, 'utf8');
  for (const venueCode of ['ST', 'HV']) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://bet.hkjc.com',
          'Referer': 'https://bet.hkjc.com/',
        },
        body: JSON.stringify({
          operationName: 'raceMeetings',
          variables: { date, venueCode },
          query: QUERY,
        }),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const m = json?.data?.raceMeetings?.[0];
      if (!m) continue;
      if (m.venueCode !== 'ST' && m.venueCode !== 'HV') continue;
      if (m.meetingType && m.meetingType !== 'D') continue;
      if (m.date !== date) continue;
      return { venue: m.venueCode, raceCount: m.totalNumberOfRace || (m.races || []).length };
    } catch {}
  }
  return null;
}

async function checkSupabase(date) {
  if (process.env.USE_SUPABASE !== '1') return { v19: null, results: null };
  try {
    const { loadV19PredictionsByDate, loadResultRaceNos } = require('./supabase-data');
    const v19Rows = await loadV19PredictionsByDate(date);
    const resultNos = await loadResultRaceNos(date);
    return { v19: v19Rows.length, results: resultNos.size };
  } catch (err) {
    return { v19: null, results: null, error: err.message };
  }
}

(async () => {
  console.log(`=== Health Check ${DATE} ===`);

  // Step 1: HKJC fixture（注意：HKJC 唔保留歷史 raceMeetings，呢個可能 null）
  const fixture = await fetchFixtureCount(DATE);
  if (!fixture) {
    console.log(`HKJC GraphQL 未找到 ${DATE} fixture（HKJC 唔保留歷史，正常）`);
    // 用 race-results-by-date.json 反推 expected raceCount
  }

  // Step 2: 檢查每個 JSON 檔
  const checks = {
    analysis: null,
    raceResults: null,
    dividends: null,
    v19: null,
    v9: null,
  };

  const a = readJsonSafe(path.join(WEB_DATA_DIR, 'analysis-by-date.json'));
  if (a?.byDate?.[DATE]) {
    const races = Array.isArray(a.byDate[DATE]) ? a.byDate[DATE] : (a.byDate[DATE].races || []);
    checks.analysis = races.length;
  }

  const rr = readJsonSafe(path.join(WEB_DATA_DIR, 'race-results-by-date.json'));
  if (rr?.byDate?.[DATE]) {
    checks.raceResults = (rr.byDate[DATE].races || []).length;
  }

  const dv = readJsonSafe(path.join(WEB_DATA_DIR, 'dividends-by-date.json'));
  if (dv?.byDate?.[DATE]) {
    checks.dividends = (dv.byDate[DATE].races || []).length;
  }

  const v19 = readJsonSafe(path.join(WEB_DATA_DIR, 'v19.json'));
  if (v19?.byDate?.[DATE]) {
    checks.v19 = (v19.byDate[DATE].races || []).length;
  }

  const v9 = readJsonSafe(path.join(WEB_DATA_DIR, 'v9-results.json'));
  if (v9?.byDate?.[DATE]) {
    checks.v9 = (v9.byDate[DATE].races || []).length;
  }

  const supabase = await checkSupabase(DATE);

  // Step 3: 判斷係咪比賽日
  const expectedRaceCount = fixture?.raceCount
    || checks.raceResults
    || checks.analysis
    || 0;

  const isRaceDay = expectedRaceCount > 0;

  if (!isRaceDay) {
    console.log(`${DATE} 並非比賽日（fixture + 所有檔案都冇該日資料）`);
    setOutput('healthy', 'true');
    setOutput('is_race_day', 'false');
    return;
  }

  // Step 4: 列印 + 判斷健康
  // 判斷係咪未來日期：未來日期只 expect pre-prediction 資料齊全
  const todayHKT = dateHKT(0);
  const isFutureOrToday = DATE >= todayHKT;

  console.log(`預期場數: ${expectedRaceCount}${fixture ? ` (${fixture.venue})` : ''}`);
  console.log(`日期類型: ${isFutureOrToday ? '未來/今日（pre-prediction 階段）' : '過去（post-prediction 階段）'}`);
  console.log('');
  console.log('資料檔狀態：');
  const issues = [];
  function report(name, count, requiredPhase = 'post') {
    // requiredPhase: 'pre' = 賽前已要齊；'post' = 賽後先要齊
    const isRequired = requiredPhase === 'pre' || !isFutureOrToday;
    let mark, status;
    if (count === expectedRaceCount) {
      mark = '✓';
      status = `${count} 場`;
    } else if (count == null) {
      mark = isRequired ? '✗' : '·';
      status = isRequired ? '缺失' : '尚未爬取（賽前正常）';
    } else {
      mark = isRequired ? '⚠' : '·';
      status = `${count} 場${isRequired ? '' : '（部分，賽中正常）'}`;
    }
    console.log(`  ${mark} ${name.padEnd(28)} ${status}`);
    if (mark === '✗' || mark === '⚠') issues.push(`${name} (${status})`);
  }
  report('analysis-by-date.json', checks.analysis, 'pre');
  report('race-results-by-date.json', checks.raceResults, 'post');
  report('dividends-by-date.json', checks.dividends, 'post');
  report('v19.json', checks.v19, 'pre');
  report('v9-results.json', checks.v9, 'pre');
  if (process.env.USE_SUPABASE === '1') {
    report('Supabase v19_predictions', supabase.v19, 'pre');
    report('Supabase race_results', supabase.results, 'post');
  }

  const healthy = issues.length === 0;
  console.log('');
  console.log(healthy ? `✅ ${DATE} 資料完整` : `❌ ${DATE} 缺失/不一致：\n   - ${issues.join('\n   - ')}`);

  setOutput('healthy', String(healthy));
  setOutput('is_race_day', 'true');
  setOutput('date', DATE);
  setOutput('issues', issues.join('; '));
  if (!healthy) process.exit(1);
})().catch((err) => {
  console.error(err);
  setOutput('healthy', 'false');
  process.exit(1);
});
