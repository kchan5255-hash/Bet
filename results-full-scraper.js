// results-full-scraper.js
// 抓某日完整賽果:每場每匹完賽馬嘅完整資料(馬號、馬編號、馬名、騎師、練馬師、磅、檔位、SP、頭馬距離、沿途走位)
// 用法: DATE=2026-05-09 VENUE=ST RACES=11 OUT=results-full-2026-05-09.json node results-full-scraper.js

const fs = require('fs');
const puppeteer = require('puppeteer');
const paths = require('./paths');

const DATE = process.env.DATE || '2026-05-09';
const VENUE = process.env.VENUE || 'ST';
const RACES = Number(process.env.RACES || 11);
const HEADLESS = process.env.HEADLESS !== 'false';
const OUT = process.env.OUT || paths.resultsFullWritePath(DATE);

function url(raceNo) {
  const d = DATE.replace(/-/g, '/');
  return `https://racing.hkjc.com/racing/information/Chinese/Racing/LocalResults.aspx?RaceDate=${d}&Racecourse=${VENUE}&RaceNo=${raceNo}`;
}

async function fetchOne(page, raceNo) {
  await page.goto(url(raceNo), { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));

  return await page.evaluate(() => {
    const text = document.body.innerText;

    // 提取賽事資料
    const meta = {};
    const titleMatch = text.match(/第\s*\d+\s*場[^]*?\(\d+\)/);
    meta.titleBlock = titleMatch ? titleMatch[0] : '';
    const classMatch = text.match(/(第[一二三四五]班|新馬賽|讓賽)[^\n]*?(\d{3,4})\s*米/);
    if (classMatch) {
      meta.className = classMatch[1];
      meta.distance = Number(classMatch[2]);
    }
    const goingMatch = text.match(/場地狀況\s*[:：]?\s*([^\n]+)/);
    if (goingMatch) meta.going = goingMatch[1].trim().replace(/\s+/g, ' ').slice(0, 30);
    const courseMatch = text.match(/賽道\s*[:：]?\s*([^\n]+)/);
    if (courseMatch) meta.course = courseMatch[1].trim().replace(/\s+/g, ' ').slice(0, 30);

    // 找出結果表
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
      plc: idx(/名次|Plc/),
      no: idx(/馬號|Horse No/),
      name: idx(/馬名|Horse Name/),
      jockey: idx(/騎師|Jockey/),
      trainer: idx(/練馬師|Trainer/),
      actWt: idx(/實際負磅|Act\.?\s*Wt/i),
      bodyWt: idx(/排位體重|Body\s*Wt/i),
      draw: idx(/檔位|Dr/i),
      lbw: idx(/頭馬距離|LBW/i),
      running: idx(/沿途走位|Running\s*Position/i),
      finishTime: idx(/完成時間|Finish\s*Time/i),
      odds: idx(/獨贏賠率|Win\s*Odds/i),
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

      // 馬名格式類似 "鵲橋飛昇 (L244)"
      const nameStr = cells[I.name] ?? '';
      const codeMatch = nameStr.match(/\(([A-Z]\d{3,4})\)/);
      const cleanName = nameStr.replace(/\([A-Z]\d{3,4}\)/, '').trim();

      runners.push({
        plc: cells[I.plc] ?? '',
        no: noStr,
        name: cleanName,
        code: codeMatch ? codeMatch[1] : '',
        jockey: cells[I.jockey] ?? '',
        trainer: cells[I.trainer] ?? '',
        actualWeight: I.actWt >= 0 ? Number(cells[I.actWt]) || cells[I.actWt] : null,
        bodyWeight: I.bodyWt >= 0 ? Number(cells[I.bodyWt]) || cells[I.bodyWt] : null,
        draw: I.draw >= 0 ? Number(cells[I.draw]) || cells[I.draw] : null,
        lbw: I.lbw >= 0 ? cells[I.lbw] : '',
        running: I.running >= 0 ? cells[I.running] : '',
        finishTime: I.finishTime >= 0 ? cells[I.finishTime] : '',
        winOdds: I.odds >= 0 ? Number(cells[I.odds]) || cells[I.odds] : null,
      });
    }

    return { meta, runners };
  });
}

(async () => {
  console.log(`抓取 ${DATE} ${VENUE} 共 ${RACES} 場完整賽果`);
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 900 },
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
  );

  const out = { date: DATE, venue: VENUE, scrapedAt: new Date().toISOString(), races: [] };

  for (let r = 1; r <= RACES; r++) {
    process.stdout.write(`R${r}: `);
    try {
      const data = await fetchOne(page, r);
      const winners = data.runners.filter((x) => /^\d+$/.test(x.plc));
      console.log(
        `${winners.length} 完賽馬 | ` +
          winners
            .slice(0, 3)
            .map((p) => `${p.plc}.${p.no}(${p.code})`)
            .join(' '),
      );
      out.races.push({
        raceNo: r,
        meta: data.meta,
        runners: data.runners,
      });
    } catch (err) {
      console.log('ERR', err.message);
      out.races.push({ raceNo: r, error: err.message });
    }
  }

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log(`\n寫入 ${OUT}`);
})();
