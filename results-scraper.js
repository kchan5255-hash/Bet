// results-scraper.js
// 爬取 HKJC LocalResults 頁面,取出每場頭三名馬號
// 用法: node results-scraper.js  (預設 2026-05-13 HV, 9 場)
//       DATE=2026-05-13 VENUE=HV RACES=9 node results-scraper.js

const fs = require('fs');
const puppeteer = require('puppeteer');

const DATE = process.env.DATE || '2026-05-13';
const VENUE = process.env.VENUE || 'HV';
const RACES = Number(process.env.RACES || 9);
const HEADLESS = process.env.HEADLESS !== 'false';
const OUT = process.env.OUT || 'results.json';
const NAV_TIMEOUT = Number(process.env.NAV_TIMEOUT || 60000);
const WAIT_MS = Number(process.env.WAIT_MS || 2500);

function resultUrl(raceNo) {
  const d = DATE.replace(/-/g, '/');
  return `https://racing.hkjc.com/racing/information/Chinese/Racing/LocalResults.aspx?RaceDate=${d}&Racecourse=${VENUE}&RaceNo=${raceNo}`;
}

async function fetchResult(page, raceNo) {
  const url = resultUrl(raceNo);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
  await new Promise((r) => setTimeout(r, WAIT_MS));

  return await page.evaluate(() => {
    // 結果表:欄含 "名次" / "Plc." 與 "馬號" / "Horse No."
    const tables = [...document.querySelectorAll('table')];
    let target = null;
    for (const t of tables) {
      const headerRow = t.querySelector('tr');
      if (!headerRow) continue;
      const headers = [...headerRow.querySelectorAll('th,td')].map((c) =>
        c.innerText.trim(),
      );
      const hasPlc = headers.some((h) => /名次|Plc/i.test(h));
      const hasNo = headers.some((h) => /馬號|Horse\s*No/i.test(h));
      if (hasPlc && hasNo) {
        target = { table: t, headers };
        break;
      }
    }
    if (!target) return { top3: [], debug: 'result table not found' };

    const headerCells = [...target.table.querySelector('tr').querySelectorAll('th,td')]
      .map((c) => c.innerText.trim());
    const plcIdx = headerCells.findIndex((h) => /名次|Plc/i.test(h));
    const noIdx = headerCells.findIndex((h) => /馬號|Horse\s*No/i.test(h));
    const nameIdx = headerCells.findIndex((h) => /馬名|Horse\s*Name/i.test(h));

    const rows = [...target.table.querySelectorAll('tr')].slice(1);
    const placements = [];
    for (const tr of rows) {
      const cells = [...tr.querySelectorAll('td,th')].map((c) =>
        c.innerText.trim().replace(/\s+/g, ' '),
      );
      const plcRaw = cells[plcIdx] ?? '';
      const plc = parseInt(plcRaw, 10);
      const no = cells[noIdx] ?? '';
      if (!Number.isFinite(plc)) continue;
      if (!/^\d+$/.test(no)) continue;
      placements.push({
        plc,
        no,
        name: nameIdx >= 0 ? cells[nameIdx] ?? '' : '',
      });
    }
    placements.sort((a, b) => a.plc - b.plc);
    const top3 = placements.slice(0, 3);
    return { top3, placements };
  });
}

async function main() {
  console.log(`爬取 ${DATE} ${VENUE} 共 ${RACES} 場賽果`);
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 900 },
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  );

  const out = {
    date: DATE,
    venue: VENUE,
    scrapedAt: new Date().toISOString(),
    races: [],
  };

  for (let r = 1; r <= RACES; r++) {
    process.stdout.write(`R${r}: `);
    try {
      const { top3, placements, debug } = await fetchResult(page, r);
      if (!top3 || top3.length === 0) {
        console.log('未取得', debug ?? '');
        out.races.push({ raceNo: r, top3: [], placements: [] });
        continue;
      }
      console.log(top3.map((p) => `${p.plc}.${p.no}(${p.name})`).join(' '));
      out.races.push({ raceNo: r, top3, placements });
    } catch (err) {
      console.log('錯誤:', err.message);
      out.races.push({ raceNo: r, top3: [], placements: [], error: err.message });
    }
  }

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log(`\n已寫入 ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
