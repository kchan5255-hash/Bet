// odds-scraper.js
// 使用 puppeteer 爬取 bet.hkjc.com 的獨贏/位置即時賠率
// 用法：
//   node odds-scraper.js                          # 預設 2026-05-13 HV，輸出 odds.json
//   DATE=2026-05-13 VENUE=HV node odds-scraper.js
//   HEADLESS=false node odds-scraper.js
//   MERGE=analysis-results.json node odds-scraper.js  # 把賠率合併回 analysis 檔

require('dotenv').config();
const fs = require('fs');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const paths = require('./paths');

const DATE = process.env.DATE || '2026-05-13';
const VENUE = process.env.VENUE || 'HV';
const HEADLESS = process.env.HEADLESS !== 'false';
const OUT = process.env.OUT || 'odds.json';
const MERGE = process.env.MERGE || '';
const NAV_TIMEOUT = Number(process.env.NAV_TIMEOUT || 60000);
const ODDS_WAIT_MS = Number(process.env.ODDS_WAIT_MS || 8000);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null;

if (!supabase) {
  console.warn('⚠ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未設定，Supabase 上傳將略過');
}

async function pushRaceToSupabase(raceNo, odds, lastUpdate) {
  if (!supabase) return;
  const rows = Object.entries(odds).map(([horseNo, o]) => ({
    date: DATE,
    venue: VENUE,
    race_no: raceNo,
    horse_no: Number(horseNo),
    win_odds: Number.isFinite(o.winOdds) ? o.winOdds : null,
    place_odds: Number.isFinite(o.placeOdds) ? o.placeOdds : null,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from('odds')
      .upsert(rows, { onConflict: 'date,venue,race_no,horse_no' });
    if (error) {
      console.error(`  supabase odds upsert R${raceNo} 失敗：${error.message}`);
      return;
    }
  }

  const { error: metaError } = await supabase
    .from('race_meta')
    .upsert(
      {
        date: DATE,
        venue: VENUE,
        race_no: raceNo,
        last_update: lastUpdate,
        scraped_at: new Date().toISOString(),
      },
      { onConflict: 'date,venue,race_no' },
    );
  if (metaError) {
    console.error(`  supabase race_meta upsert R${raceNo} 失敗：${metaError.message}`);
  }
}

function readExistingPayload() {
  if (!fs.existsSync(OUT)) return null;
  try {
    return JSON.parse(fs.readFileSync(OUT, 'utf8'));
  } catch {
    return null;
  }
}

function writeOddsPayload(results) {
  const existing = readExistingPayload();
  const racesByNo = new Map(
    Array.isArray(existing?.races)
      ? existing.races.map((race) => [race.raceNo, race])
      : [],
  );
  for (const race of results) {
    racesByNo.set(race.raceNo, race);
  }

  const payload = {
    date: DATE,
    venueCode: VENUE,
    scrapedAt: new Date().toISOString(),
    races: [...racesByNo.values()].sort((a, b) => a.raceNo - b.raceNo),
  };

  const tempPath = `${OUT}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tempPath, OUT);
  return payload;
}

function raceUrl(raceNo) {
  return `https://bet.hkjc.com/ch/racing/wp/${DATE}/${VENUE}/${raceNo}`;
}

async function readRaceCount() {
  const metaPath = paths.miscPath('graphql-race-data.json');
  if (!fs.existsSync(metaPath)) return 9;
  try {
    const payload = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const meeting = payload
      .find((entry) => entry?.data?.data?.raceMeetings)
      ?.data.data.raceMeetings[0];
    return meeting?.races?.length ?? 9;
  } catch {
    return 9;
  }
}

async function fetchRaceOdds(page, raceNo) {
  const url = raceUrl(raceNo);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
  await new Promise((r) => setTimeout(r, ODDS_WAIT_MS));

  const data = await page.evaluate(() => {
    const tables = [...document.querySelectorAll('table')];
    const targetTable = tables.find((t) => {
      const firstRow = t.querySelector('tr');
      if (!firstRow) return false;
      const headers = [...firstRow.querySelectorAll('th,td')]
        .map((c) => c.innerText.trim());
      return headers.includes('獨贏') && headers.includes('位置');
    });

    const odds = {};
    const updateTimeMatch = document.body.innerText.match(
      /更新時間[:：\s]*([\d\/]+\s*[\d:]+)/,
    );

    if (!targetTable) {
      return { odds, lastUpdate: null, debug: 'no table with 獨贏/位置' };
    }

    const allRows = [...targetTable.querySelectorAll('tr')];
    const header = [...allRows[0].querySelectorAll('th,td')]
      .map((c) => c.innerText.trim());
    const winIdx = header.indexOf('獨贏');
    const placeIdx = header.indexOf('位置');

    for (const tr of allRows.slice(1)) {
      const cells = [...tr.querySelectorAll('td,th')].map((c) =>
        c.innerText.trim(),
      );
      const no = cells[0];
      if (!/^\d+$/.test(no)) continue;
      const rawWin = (cells[winIdx] ?? '').replace(/[^\d.]/g, '');
      const rawPlace = (cells[placeIdx] ?? '').replace(/[^\d.]/g, '');
      const win = parseFloat(rawWin);
      const place = parseFloat(rawPlace);
      if (!Number.isFinite(win) && !Number.isFinite(place)) continue;
      odds[no] = {
        winOdds: Number.isFinite(win) ? win : null,
        placeOdds: Number.isFinite(place) ? place : null,
      };
    }

    return {
      odds,
      lastUpdate: updateTimeMatch ? updateTimeMatch[1].trim() : null,
    };
  });

  return data;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();
  page.on('request', (req) => {
    if (['image', 'media', 'font'].includes(req.resourceType())) {
      req.abort().catch(() => {});
    } else {
      req.continue().catch(() => {});
    }
  });
  await page.setRequestInterception(true);

  const raceCount = await readRaceCount();
  const results = [];
  for (let raceNo = 1; raceNo <= raceCount; raceNo++) {
    process.stdout.write(`R${raceNo}/${raceCount} … `);
    let attempt = 0;
    let finalResult = null;
    while (attempt < 3) {
      attempt++;
      try {
        const { odds, lastUpdate } = await fetchRaceOdds(page, raceNo);
        const count = Object.keys(odds).length;
        if (count > 0) {
          finalResult = { odds, lastUpdate };
          break;
        }
        process.stdout.write(`(retry ${attempt})… `);
        await new Promise((r) => setTimeout(r, 3000));
      } catch (err) {
        console.log('錯誤：', err.message);
        break;
      }
    }
    if (finalResult) {
      const count = Object.keys(finalResult.odds).length;
      console.log(`${count} 匹，更新 ${finalResult.lastUpdate ?? 'n/a'}`);
      results.push({ raceNo, ...finalResult });
      await pushRaceToSupabase(raceNo, finalResult.odds, finalResult.lastUpdate);
    } else {
      console.log('抓取失敗');
      results.push({ raceNo, odds: {}, lastUpdate: null });
    }
    writeOddsPayload(results);
  }

  await browser.close();

  const payload = writeOddsPayload(results);
  console.log(`\n已寫入 ${OUT}`);

  if (MERGE && fs.existsSync(MERGE)) {
    mergeIntoAnalysis(MERGE, payload);
  }
}

function mergeIntoAnalysis(path, oddsPayload) {
  const races = JSON.parse(fs.readFileSync(path, 'utf8'));
  const oddsByRace = new Map(
    oddsPayload.races.map((r) => [r.raceNo, r.odds]),
  );
  let merged = 0;
  for (const race of races) {
    const pool = oddsByRace.get(race.raceNo);
    if (!pool) continue;
    for (const runner of race.runners) {
      const o = pool[String(runner.no)];
      if (o) {
        runner.winOdds = o.winOdds;
        runner.placeOdds = o.placeOdds;
        merged++;
      }
    }
  }
  fs.writeFileSync(path, JSON.stringify(races, null, 2), 'utf8');
  console.log(`合併賠率 → ${path}（${merged} 匹馬更新）`);

  const webCopy = 'web/src/data/analysis-results.json';
  if (fs.existsSync('web/src/data')) {
    fs.writeFileSync(webCopy, JSON.stringify(races, null, 2), 'utf8');
    console.log(`同步至 ${webCopy}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
