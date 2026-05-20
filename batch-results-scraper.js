// batch-results-scraper.js
// 批量爬取 all-race-dates.json 中所有賽期的完整賽果
// 同時寫入本地 results-full-YYYY-MM-DD.json 和 Supabase race_results 表
//
// 用法:
//   node batch-results-scraper.js
//   START_DATE=2024-01-01 END_DATE=2024-12-31 node batch-results-scraper.js
//   SKIP_EXISTING=false node batch-results-scraper.js   ← 強制重新爬取

require('dotenv').config();
const fs = require('fs');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const paths = require('./paths');

const DATES_FILE   = process.env.DATES_FILE    || paths.miscPath('all-race-dates.json');
const START_DATE   = process.env.START_DATE    || '2024-01-01';
const END_DATE     = process.env.END_DATE      || '2026-12-31';
const SKIP_EXISTING = process.env.SKIP_EXISTING !== 'false';
const HEADLESS     = process.env.HEADLESS      !== 'false';
const WAIT_MS      = Number(process.env.WAIT_MS || 1200);
const DELAY_MS     = Number(process.env.DELAY_MS || 3000);  // 每個賽期間隔

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function resultUrl(date, venue, raceNo) {
  return `https://racing.hkjc.com/racing/information/Chinese/Racing/LocalResults.aspx?RaceDate=${date.replace(/-/g, '/')}&Racecourse=${venue}&RaceNo=${raceNo}`;
}

async function fetchRace(page, date, venue, raceNo) {
  await page.goto(resultUrl(date, venue, raceNo), {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, WAIT_MS));

  return await page.evaluate(() => {
    const text = document.body.innerText;
    const meta = {};

    const classMatch = text.match(/(第[一二三四五]班|新馬賽|讓賽)[^\n]*?(\d{3,4})\s*米/);
    if (classMatch) {
      meta.className = classMatch[1];
      meta.distance  = Number(classMatch[2]);
    }
    const goingMatch = text.match(/場地狀況\s*[:：]?\s*([^\n]+)/);
    if (goingMatch) meta.going = goingMatch[1].trim().replace(/\s+/g, ' ').slice(0, 40);
    const courseMatch = text.match(/賽道\s*[:：]?\s*([^\n]+)/);
    if (courseMatch) meta.course = courseMatch[1].trim().replace(/\s+/g, ' ').slice(0, 40);

    const tables = [...document.querySelectorAll('table')];
    const resultTable = tables.find(
      (t) =>
        /名次|Plc/.test(t.innerText) &&
        /馬號|Horse No/.test(t.innerText) &&
        /騎師|Jockey/.test(t.innerText),
    );
    if (!resultTable) return { meta, runners: [] };

    const headerCells = [...resultTable.querySelector('tr').querySelectorAll('th,td')].map(
      (c) => c.innerText.trim().replace(/\s+/g, ' '),
    );
    const idx = (re) => headerCells.findIndex((h) => re.test(h));
    const I = {
      plc:     idx(/名次|Plc/),
      no:      idx(/馬號|Horse No/),
      name:    idx(/馬名|Horse Name/),
      jockey:  idx(/騎師|Jockey/),
      trainer: idx(/練馬師|Trainer/),
      actWt:   idx(/實際負磅|Act\.?\s*Wt/i),
      bodyWt:  idx(/排位體重|Body\s*Wt/i),
      draw:    idx(/檔位|Dr/i),
      lbw:     idx(/頭馬距離|LBW/i),
      running: idx(/沿途走位|Running\s*Position/i),
      finishTime: idx(/完成時間|Finish\s*Time/i),
      odds:    idx(/獨贏賠率|Win\s*Odds/i),
    };

    const rows = [...resultTable.querySelectorAll('tr')].slice(1);
    const runners = [];
    for (const tr of rows) {
      const cells = [...tr.querySelectorAll('td,th')].map((c) =>
        c.innerText.trim().replace(/\s+/g, ' '),
      );
      if (cells.length < 6) continue;
      const noStr = (cells[I.no] ?? '').trim();
      if (!/^\d+$/.test(noStr)) continue;

      const nameStr  = cells[I.name] ?? '';
      const codeMatch = nameStr.match(/\(([A-Z]\d{3,4})\)/);
      const cleanName = nameStr.replace(/\([A-Z]\d{3,4}\)/, '').trim();

      runners.push({
        plc:           cells[I.plc] ?? '',
        no:            noStr,
        name:          cleanName,
        code:          codeMatch ? codeMatch[1] : '',
        jockey:        cells[I.jockey] ?? '',
        trainer:       cells[I.trainer] ?? '',
        actualWeight:  I.actWt   >= 0 ? Number(cells[I.actWt])   || null : null,
        bodyWeight:    I.bodyWt  >= 0 ? Number(cells[I.bodyWt])  || null : null,
        draw:          I.draw    >= 0 ? Number(cells[I.draw])    || null : null,
        lbw:           I.lbw     >= 0 ? cells[I.lbw]  : '',
        running:       I.running >= 0 ? cells[I.running] : '',
        finishTime:    I.finishTime >= 0 ? cells[I.finishTime] : '',
        winOdds:       I.odds    >= 0 ? Number(cells[I.odds])    || null : null,
      });
    }
    return { meta, runners };
  });
}

async function upsertToSupabase(date, venue, raceNo, meta, runners, scrapedAt) {
  if (!runners.length) return;
  const rows = runners.map((r) => ({
    date,
    venue,
    race_no:       raceNo,
    class_name:    meta.className  || null,
    distance:      meta.distance   || null,
    going:         meta.going      || null,
    course:        meta.course     || null,
    plc:           r.plc           || null,
    horse_no:      r.no,
    horse_name:    r.name          || null,
    horse_code:    r.code          || null,
    jockey:        r.jockey        || null,
    trainer:       r.trainer       || null,
    draw:          r.draw          || null,
    actual_weight: r.actualWeight  || null,
    body_weight:   r.bodyWeight    || null,
    lbw:           r.lbw           || null,
    running:       r.running       || null,
    finish_time:   r.finishTime    || null,
    win_odds:      r.winOdds       || null,
    scraped_at:    scrapedAt,
  }));

  const { error } = await supabase
    .from('race_results')
    .upsert(rows, { onConflict: 'date,venue,race_no,horse_no' });
  if (error) console.error(`  Supabase upsert error [${date} R${raceNo}]:`, error.message);
}

(async () => {
  if (!fs.existsSync(DATES_FILE)) {
    console.error(`找不到 ${DATES_FILE}，請先執行 node discover-dates.js`);
    process.exit(1);
  }

  const allDates = JSON.parse(fs.readFileSync(DATES_FILE, 'utf8'));
  const targets = allDates.filter(
    ({ date }) => date >= START_DATE && date <= END_DATE,
  );
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
    const outFile = paths.resultsFullWritePath(date);

    if (SKIP_EXISTING && fs.existsSync(outFile)) {
      skipped++;
      process.stdout.write(`[跳過] ${date} ${venue} (已有 ${outFile})\n`);
      continue;
    }

    console.log(`\n[${++done}/${targets.length - skipped}] ${date} ${venue} ${raceCount} 場`);
    const scrapedAt = new Date().toISOString();
    const out = { date, venue, scrapedAt, races: [] };

    for (let r = 1; r <= raceCount; r++) {
      process.stdout.write(`  R${r}: `);
      try {
        const data = await fetchRace(page, date, venue, r);
        const finishers = data.runners.filter((x) => /^\d+$/.test(x.plc));
        console.log(
          `${finishers.length} 匹完賽 | ` +
            finishers
              .slice(0, 3)
              .map((p) => `${p.plc}.${p.no}`)
              .join(' '),
        );
        out.races.push({ raceNo: r, meta: data.meta, runners: data.runners });
        await upsertToSupabase(date, venue, r, data.meta, data.runners, scrapedAt);
      } catch (err) {
        console.log('ERR', err.message);
        out.races.push({ raceNo: r, error: err.message });
      }
    }

    fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');
    console.log(`  → 寫入 ${outFile}`);

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  await browser.close();
  console.log(`\n完成！處理 ${done} 個賽期，跳過 ${skipped} 個`);
})();
