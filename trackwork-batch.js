// trackwork-batch.js — 4 個 puppeteer worker 並行跑
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const HORSES_FILE = 'd:/AI/Bet/data/horses/horses-all.json';
const OUT_DIR = 'd:/AI/Bet/data/trackwork';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const WORKERS = Number(process.env.WORKERS || 4);
const FORCE = process.env.FORCE === '1';

function deriveHintYear(horse) {
  const oldest = horse.records?.[horse.records.length - 1]?.date;
  if (!oldest) return null;
  const m = oldest.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const yr = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return yr;
}

async function fetchHorseTrackwork(page, horseId) {
  const url = `https://racing.hkjc.com/zh-hk/local/information/trackworkresult?horseid=${horseId}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 800));
  return await page.evaluate(() => {
    const text = document.body.innerText;
    const idx = text.indexOf('日期\t晨操類別');
    if (idx < 0) return { records: [] };
    const after = text.slice(idx);
    const lines = after.split('\n').slice(1);
    const recs = [];
    for (const ln of lines) {
      const parts = ln.split('\t').map(s => s.trim());
      if (parts.length < 4) continue;
      if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(parts[0])) {
        if (parts[0] && !parts[0].includes('/')) break;
        continue;
      }
      recs.push({
        date: parts[0],
        type: parts[1],
        location: parts[2],
        detail: parts[3],
        gear: parts[4] || '',
      });
    }
    return { records: recs };
  });
}

async function tryHorse(page, code, hintYear) {
  const tryYears = hintYear ? [hintYear, hintYear-1, hintYear+1] : [2025, 2024, 2026, 2023, 2022];
  for (const year of tryYears) {
    if (!year || year < 2010 || year > 2030) continue;
    const horseId = `HK_${year}_${code}`;
    try {
      const result = await fetchHorseTrackwork(page, horseId);
      if (result.records.length > 0) return { horseId, ...result };
    } catch (e) {}
  }
  return null;
}

async function worker(workerId, queue, total, stats) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 Chrome/120 Safari/537.36');
  while (true) {
    const horse = queue.shift();
    if (!horse) break;
    const outFile = path.join(OUT_DIR, `${horse.code}.json`);
    if (!FORCE && fs.existsSync(outFile)) {
      stats.skipped++;
      continue;
    }
    try {
      const hint = deriveHintYear(horse);
      const result = await tryHorse(page, horse.code, hint);
      if (!result) {
        fs.writeFileSync(outFile, JSON.stringify({
          code: horse.code, name: horse.name, horseId: null, records: [],
          scrapedAt: new Date().toISOString(), status: 'not-found',
        }));
        stats.failed++;
      } else {
        fs.writeFileSync(outFile, JSON.stringify({
          code: horse.code, name: horse.name, horseId: result.horseId,
          records: result.records, scrapedAt: new Date().toISOString(),
          status: 'ok',
        }));
        stats.ok++;
      }
      stats.done++;
      if (stats.done % 20 === 0) {
        const elapsed = (Date.now() - stats.startTs) / 1000;
        const rate = stats.done / elapsed;
        const remaining = ((total - stats.done) / rate / 60).toFixed(1);
        console.log(`[${stats.done}/${total}] W${workerId} ${horse.code} | ok=${stats.ok} skip=${stats.skipped} fail=${stats.failed} | ~${remaining} min`);
      }
    } catch (e) {
      stats.failed++;
      stats.done++;
      console.error(`W${workerId} ${horse.code}: ${e.message}`);
    }
  }
  await browser.close();
}

(async () => {
  const horses = JSON.parse(fs.readFileSync(HORSES_FILE, 'utf8')).horses;
  const queue = horses.slice();
  const total = queue.length;
  const stats = { ok:0, skipped:0, failed:0, done:0, startTs: Date.now() };
  console.log(`Total horses: ${total}, workers: ${WORKERS}`);
  await Promise.all(Array.from({length: WORKERS}, (_, i) => worker(i+1, queue, total, stats)));
  const elapsed = ((Date.now() - stats.startTs)/1000).toFixed(0);
  console.log(`\nDone in ${elapsed}s: ${stats.ok} ok / ${stats.skipped} skipped / ${stats.failed} failed`);
})();
