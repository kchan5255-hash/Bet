// batch-dividends-scraper.js
// 批量爬取 all-race-dates.json 中所有賽期的派彩數據（Puppeteer 版）
// 同時寫入 web/src/data/dividends-by-date.json 和 Supabase race_dividends 表
//
// 用法:
//   node batch-dividends-scraper.js
//   START_DATE=2024-01-01 END_DATE=2024-12-31 node batch-dividends-scraper.js

require('dotenv').config();
const fs = require('fs');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const paths = require('./paths');

const DATES_FILE    = process.env.DATES_FILE    || paths.miscPath('all-race-dates.json');
const OUT_FILE      = process.env.OUT_FILE      || 'web/src/data/dividends-by-date.json';
const START_DATE    = process.env.START_DATE    || '2024-01-01';
const END_DATE      = process.env.END_DATE      || '2026-12-31';
const SKIP_EXISTING = process.env.SKIP_EXISTING !== 'false';
const HEADLESS      = process.env.HEADLESS      !== 'false';
const WAIT_MS       = Number(process.env.WAIT_MS || 1500);
const DELAY_MS      = Number(process.env.DELAY_MS || 1000);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const venueName = (v) => (v === 'HV' ? '跑馬地' : v === 'ST' ? '沙田' : v);

function raceUrl(date, venue, raceNo) {
  return `https://racing.hkjc.com/racing/information/Chinese/Racing/LocalResults.aspx?RaceDate=${date.replace(/-/g, '/')}&Racecourse=${venue}&RaceNo=${raceNo}`;
}

async function fetchRaceDividends(page, date, venue, raceNo) {
  // 直接用新版 URL，避免 http 重定向問題
  const newUrl = `https://racing.hkjc.com/zh-hk/local/information/localresults?RaceDate=${date.replace(/-/g, '/')}&Racecourse=${venue}&RaceNo=${raceNo}`;
  await page.goto(newUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, WAIT_MS));

  return await page.evaluate(() => {
    const tables = [...document.querySelectorAll('table')];
    const divTable = tables.find((t) =>
      /彩池.*勝出組合.*派彩|Pool.*Winning.*Combination.*Dividend/.test(
        t.innerText.replace(/\s+/g, ' '),
      ),
    );
    if (!divTable) return [];

    const rows = [...divTable.querySelectorAll('tr')].map((tr) =>
      [...tr.querySelectorAll('td,th')].map((c) => c.innerText.trim().replace(/\s+/g, ' ')),
    ).filter((r) => r.length);

    const results = [];
    let currentPool = '';
    for (const row of rows) {
      if (row.length < 2) continue;
      if (/彩池|Pool/.test(row[0]) && row.length >= 3) continue; // header

      let pool, combo, dividend;
      if (row.length >= 3) {
        [pool, combo, dividend] = row;
        currentPool = pool;
      } else if (row.length === 2) {
        pool = currentPool;
        [combo, dividend] = row;
      } else {
        continue;
      }
      if (!pool || !combo || !dividend) continue;
      results.push({ pool: pool.trim(), combo: combo.trim(), dividend: dividend.trim() });
    }
    return results;
  });
}

async function upsertToSupabase(date, venue, raceNo, dividends, scrapedAt) {
  if (!dividends.length) return;
  const rows = dividends.map((d) => ({
    date,
    venue,
    race_no:    raceNo,
    pool:       d.pool,
    combo:      d.combo,
    dividend:   d.dividend,
    scraped_at: scrapedAt,
  }));

  const { error } = await supabase
    .from('race_dividends')
    .upsert(rows, { onConflict: 'date,venue,race_no,pool,combo' });
  if (error) console.error(`  Supabase error [${date} R${raceNo}]:`, error.message);
}

(async () => {
  if (!fs.existsSync(DATES_FILE)) {
    console.error(`找不到 ${DATES_FILE}，請先執行 node discover-dates.js`);
    process.exit(1);
  }

  // 載入現有派彩數據（支援增量更新）
  let existing = { dates: [], byDate: {} };
  if (fs.existsSync(OUT_FILE)) {
    existing = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    console.log(`已有 ${existing.dates.length} 個賽期的派彩數據`);
  }

  const allDates = JSON.parse(fs.readFileSync(DATES_FILE, 'utf8'));
  const targets = allDates.filter(({ date }) => date >= START_DATE && date <= END_DATE);
  console.log(`目標賽期：${targets.length} 個（${START_DATE} 至 ${END_DATE}）`);

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 900 },
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
  );

  let done = 0;
  let skipped = 0;

  for (const { date, venue, raceCount } of targets) {
    if (SKIP_EXISTING && existing.byDate[date]) {
      skipped++;
      process.stdout.write(`[跳過] ${date}\n`);
      continue;
    }

    console.log(`\n[${++done}/${targets.length - skipped}] ${date} ${venue} ${raceCount} 場`);
    const scrapedAt = new Date().toISOString();
    const races = [];

    for (let raceNo = 1; raceNo <= raceCount; raceNo++) {
      process.stdout.write(`  R${raceNo}: `);
      try {
        const dividends = await fetchRaceDividends(page, date, venue, raceNo);
        console.log(`${dividends.length} 筆派彩`);
        races.push({ raceNo, dividends });
        await upsertToSupabase(date, venue, raceNo, dividends, scrapedAt);
      } catch (err) {
        console.log('ERR', err.message);
        races.push({ raceNo, dividends: [] });
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    // 更新本地 JSON
    existing.byDate[date] = { date, venue, venueName: venueName(venue), races };
    if (!existing.dates.includes(date)) existing.dates.push(date);
    existing.dates.sort();

    // 每個賽期後立即儲存（斷點保護）
    fs.writeFileSync(OUT_FILE, JSON.stringify(existing, null, 2), 'utf8');
    console.log(`  → 已更新 ${OUT_FILE}`);

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  await browser.close();
  console.log(`\n完成！處理 ${done} 個賽期，跳過 ${skipped} 個`);
  console.log(`輸出：${OUT_FILE}`);
})();
