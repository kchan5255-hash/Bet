// trackwork-history-scraper.js
// Scrape 每隻馬嘅完整 trackwork 歷史
//
// 用法：
//   node trackwork-history-scraper.js                      # 全部 active 馬
//   START=0 LIMIT=50 node trackwork-history-scraper.js     # 部分（resumable）
//   CODES=H177,G251 node trackwork-history-scraper.js      # 指定 codes

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const HORSES_FILE = 'd:/AI/Bet/data/horses/horses-all.json';
const OUT_DIR = 'd:/AI/Bet/data/trackwork';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const START = Number(process.env.START || 0);
const LIMIT = Number(process.env.LIMIT || 0);  // 0 = all
const CODES = process.env.CODES ? process.env.CODES.split(',') : null;
const FORCE = process.env.FORCE === '1';

// 解析每行 trackwork
// 18/05/2026	踱步	沙田 內圈	內圈 倒快兩圈 (助手)	H
function parseLine(parts) {
  if (parts.length < 4) return null;
  const [date, type, location, detail, gear] = parts;
  if (!/\d{1,2}\/\d{1,2}\/\d{4}/.test(date)) return null;
  return {
    date: date.trim(),
    type: (type||'').trim(),
    location: (location||'').trim(),
    detail: (detail||'').trim(),
    gear: (gear||'').trim(),
  };
}

async function fetchHorseTrackwork(page, horseId) {
  const url = `https://racing.hkjc.com/zh-hk/local/information/trackworkresult?horseid=${horseId}`;
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 1500));

  const result = await page.evaluate(() => {
    const text = document.body.innerText;
    const idx = text.indexOf('日期\t晨操類別');
    if (idx < 0) return { records: [], notFound: true };
    const after = text.slice(idx);
    const lines = after.split('\n').slice(1);  // skip header
    const recs = [];
    for (const ln of lines) {
      const parts = ln.split('\t').map(s => s.trim());
      if (parts.length < 4) continue;
      if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(parts[0])) {
        // stop at non-record line
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
    return { records: recs, notFound: false };
  });

  return result;
}

async function tryHorse(page, code, hintYear) {
  // HK_yyyy_xxxx — try hint year first only（快），如果 fail 就 expand
  const tryYears = hintYear ? [hintYear, hintYear-1, hintYear+1] : [2025, 2024, 2026, 2023, 2022, 2021, 2020];
  for (const year of tryYears) {
    if (!year || year < 2010 || year > 2030) continue;
    const horseId = `HK_${year}_${code}`;
    try {
      const result = await fetchHorseTrackwork(page, horseId);
      if (result.records.length > 0) {
        return { horseId, ...result };
      }
    } catch (e) { /* ignore */ }
  }
  return null;
}

function deriveHintYear(horse) {
  // 由 records 最早一場 推 import year（同 race date 應該差不多）
  const oldest = horse.records?.[horse.records.length - 1]?.date;
  if (!oldest) return null;
  const m = oldest.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const yr = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return yr;
}

(async () => {
  const horses = JSON.parse(fs.readFileSync(HORSES_FILE, 'utf8')).horses;
  let targets = CODES
    ? horses.filter(h => CODES.includes(h.code))
    : horses;
  if (LIMIT > 0) targets = targets.slice(START, START + LIMIT);
  else if (START > 0) targets = targets.slice(START);

  console.log(`Targets: ${targets.length} horses (start=${START})`);
  console.log(`Output dir: ${OUT_DIR}`);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 Chrome/120 Safari/537.36');

  let ok = 0, skipped = 0, failed = 0;
  const startTs = Date.now();

  for (let i = 0; i < targets.length; i++) {
    const horse = targets[i];
    const outFile = path.join(OUT_DIR, `${horse.code}.json`);
    if (!FORCE && fs.existsSync(outFile)) {
      skipped++;
      continue;
    }
    try {
      const hint = deriveHintYear(horse);
      const result = await tryHorse(page, horse.code, hint);
      if (!result) {
        // 寫 empty marker
        fs.writeFileSync(outFile, JSON.stringify({
          code: horse.code, name: horse.name, horseId: null,
          records: [], scrapedAt: new Date().toISOString(),
          status: 'not-found',
        }, null, 2));
        failed++;
      } else {
        fs.writeFileSync(outFile, JSON.stringify({
          code: horse.code, name: horse.name, horseId: result.horseId,
          records: result.records, scrapedAt: new Date().toISOString(),
          status: 'ok',
        }, null, 2));
        ok++;
      }
    } catch (e) {
      failed++;
      console.error(`[${i+1}/${targets.length}] ${horse.code} ${horse.name}: ERR ${e.message}`);
    }
    if ((i+1) % 20 === 0) {
      const rate = (i+1) / ((Date.now() - startTs) / 1000);
      const remaining = ((targets.length - i - 1) / rate / 60).toFixed(1);
      console.log(`[${i+1}/${targets.length}] ${horse.code} ${horse.name} | ok=${ok} skip=${skipped} fail=${failed} | ~${remaining} min remaining`);
    }
  }

  await browser.close();
  const total = (Date.now() - startTs) / 1000;
  console.log(`\nDone in ${total.toFixed(0)}s: ${ok} ok / ${skipped} skipped / ${failed} failed`);
})();
