// dividends-scraper.js
// 抓 HKJC 派彩表(獨贏、位置、連贏、位置Q、二重彩、三重彩等)
// 用法: DATE=2026-05-09 VENUE=ST RACES=11 OUT=dividends-2026-05-09.json node dividends-scraper.js

const fs = require('fs');
const puppeteer = require('puppeteer');
const paths = require('./paths');

const DATE = process.env.DATE;
const VENUE = process.env.VENUE;
const RACES = Number(process.env.RACES);
const OUT = process.env.OUT || paths.dividendsWritePath(DATE);

function url(raceNo) {
  const d = DATE.replace(/-/g, '/');
  return `https://racing.hkjc.com/racing/information/Chinese/Racing/LocalResults.aspx?RaceDate=${d}&Racecourse=${VENUE}&RaceNo=${raceNo}`;
}

async function fetchRace(page, raceNo) {
  await page.goto(url(raceNo), { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1000));

  return await page.evaluate(() => {
    const tables = [...document.querySelectorAll('table')];
    // 派彩表特徵:表頭有 "彩池|勝出組合|派彩"
    const divTable = tables.find((t) =>
      /彩池\s*勝出組合\s*派彩|彩池.*勝出組合.*派彩/.test(t.innerText.replace(/\s+/g, ' ')),
    );
    if (!divTable) return { dividends: {}, raw: '' };

    const rows = [...divTable.querySelectorAll('tr')]
      .map((tr) =>
        [...tr.querySelectorAll('td,th')].map((c) =>
          c.innerText.trim().replace(/\s+/g, ' '),
        ),
      )
      .filter((r) => r.length);

    const dividends = {};
    let currentPool = null;
    for (const row of rows) {
      if (row.length < 2) continue;
      if (/彩池|Pool/.test(row[0])) continue; // header

      let pool, combo, amount;
      if (row.length === 3) {
        [pool, combo, amount] = row;
        currentPool = pool;
      } else if (row.length === 2) {
        pool = currentPool;
        [combo, amount] = row;
      } else {
        continue;
      }
      if (!pool) continue;

      const amountNum = Number(String(amount).replace(/[,\s]/g, ''));
      if (!Number.isFinite(amountNum)) continue;

      const key = pool.replace(/\s/g, '');
      if (!dividends[key]) dividends[key] = [];
      dividends[key].push({ combo: combo.trim(), amount: amountNum });
    }

    return { dividends };
  });
}

(async () => {
  console.log(`抓派彩 ${DATE} ${VENUE} ${RACES} 場`);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
  );

  const out = { date: DATE, venue: VENUE, races: [] };
  for (let r = 1; r <= RACES; r++) {
    process.stdout.write(`R${r}: `);
    try {
      const d = await fetchRace(page, r);
      const summary = Object.entries(d.dividends)
        .map(([k, v]) => `${k}=${v.length}`)
        .join(' ');
      console.log(summary);
      out.races.push({ raceNo: r, dividends: d.dividends });
    } catch (err) {
      console.log('ERR', err.message);
      out.races.push({ raceNo: r, error: err.message });
    }
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log(`寫入 ${OUT}`);
})();
