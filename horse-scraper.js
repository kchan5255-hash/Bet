// horse-scraper.js
// 抓指定馬編號清單嘅 Horse.aspx 往績,用法:
//   IN=results-full-2026-05-09.json OUT=horses-2026-05-09.json CONCURRENCY=6 node horse-scraper.js

const fs = require('fs');
const puppeteer = require('puppeteer');
const paths = require('./paths');

const DEFAULT_DATE = '2026-05-09';
const IN = process.env.IN || paths.resultsFullPath(DEFAULT_DATE);
const OUT = process.env.OUT || paths.horsesWritePath(`horses-${DEFAULT_DATE}.json`);
const CONCURRENCY = Number(process.env.CONCURRENCY || 6);
const HEADLESS = process.env.HEADLESS !== 'false';

function extractCodes(file) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const codes = new Set();
  d.races.forEach((r) => (r.runners || []).forEach((x) => x.code && codes.add(x.code)));
  return [...codes];
}

async function scrapeHorse(browser, code) {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'media', 'font', 'stylesheet'].includes(req.resourceType())) req.abort();
    else req.continue();
  });
  try {
    await page.goto(
      `https://racing.hkjc.com/racing/information/English/Horse/Horse.aspx?HorseNo=${encodeURIComponent(code)}`,
      { waitUntil: 'domcontentloaded', timeout: 40000 },
    );
    const data = await page.evaluate(() => {
      const clean = (v) => (v || '').replace(/\s+/g, ' ').trim();
      const tables = [...document.querySelectorAll('table')].map((t) => ({
        rows: [...t.querySelectorAll('tr')]
          .map((tr) => [...tr.querySelectorAll('th,td')].map((td) => clean(td.innerText)).filter(Boolean))
          .filter((row) => row.length),
      }));
      const profile = {};
      for (const t of tables) {
        for (const row of t.rows) {
          if (row.length >= 3 && row[1] === ':') {
            profile[row[0]] = row.slice(2).join(' ');
          }
        }
      }
      const perf = tables.find((t) =>
        t.rows.some(
          (row) => row.includes('Race Index') && row.includes('Pla.') && row.includes('Win Odds'),
        ),
      );
      let records = [];
      if (perf) {
        const hdr = perf.rows.findIndex((row) => row.includes('Race Index') && row.includes('Pla.'));
        records = perf.rows
          .slice(hdr + 1)
          .filter((row) => row.length >= 16 && /^\d+$/.test(row[0]) && /^[\d\s\w]{1,3}$/.test(row[1]))
          .map((row) => ({
            place: row[1],
            date: row[2],
            track: row[3],
            distance: row[4],
            going: row[5],
            classNo: row[6],
            draw: row[7],
            rating: row[8],
            trainer: row[9],
            jockey: row[10],
            lbw: row[11],
            odds: row[12],
            actWt: row[13],
            bodyWeight: row[16],
          }));
      }
      return { profile, records };
    });
    await page.close();
    return { code, ...data };
  } catch (err) {
    await page.close().catch(() => {});
    return { code, profile: {}, records: [], error: err.message };
  }
}

(async () => {
  const codes = extractCodes(IN);
  console.log(`抓取 ${codes.length} 匹馬往績 (concurrency=${CONCURRENCY})`);
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const horses = [];
  let cursor = 0;
  async function worker() {
    while (cursor < codes.length) {
      const code = codes[cursor++];
      const data = await scrapeHorse(browser, code);
      horses.push(data);
      process.stdout.write(
        `\r[${horses.length}/${codes.length}] ${code} records=${data.records?.length ?? 0}${data.error ? ' ERR' : ''}`,
      );
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log('');
  await browser.close();

  fs.writeFileSync(OUT, JSON.stringify({ scrapedAt: new Date().toISOString(), horses }, null, 2), 'utf8');
  console.log(`寫入 ${OUT}`);
})();
