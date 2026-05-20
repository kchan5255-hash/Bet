// trackwork-scraper.js
// 由 HKJC 嘅 trackwork 頁面 scrape 下個 race meeting 嘅晨操紀錄
//
// 用法：
//   node trackwork-scraper.js                    # 默認下個 meeting
//   OUT=data/misc/trackwork-2026-05-21.json node trackwork-scraper.js
//
// 輸出：
//   每隻馬包含：horseNo, name, trainer, last6, trial, gallop, canter, swim, treadmill, walker, rest

const fs = require('fs');
const puppeteer = require('puppeteer');
const paths = require('./paths');

const URL = 'https://racing.hkjc.com/zh-hk/local/information/localtrackwork';
const OUT = process.env.OUT;  // optional

// 解析快操 line：日期: 賽道 跑道 時間 (騎師)
//   "16/05: 沙田 全天候 27.8 25.8 24.4 (1.18.0) (助手)"
//   "16/05: 沙田 全天候 27.7 23.4 (51.1) (巴度)"
function parseGallopLine(line) {
  if (!line || !line.trim()) return null;
  const m = line.match(/(\d{1,2}\/\d{1,2}):\s*(\S+)\s+(\S+)\s+([\d.\s]+?)\s*\(([\d.:]+)\)\s*\(([^)]+)\)/);
  if (!m) return null;
  const [, date, course, surface, splits, totalTime, jockey] = m;
  const splitNums = splits.trim().split(/\s+/).map(Number).filter(Number.isFinite);
  // 將 (1.18.0) 等 形式轉秒
  let seconds = 0;
  if (totalTime.includes(':')) {
    const [m2, s] = totalTime.split(':');
    seconds = Number(m2) * 60 + Number(s);
  } else if (totalTime.includes('.')) {
    const parts = totalTime.split('.');
    if (parts.length === 3) seconds = Number(parts[0]) * 60 + Number(parts[1]) + Number(parts[2]) / 100;
    else seconds = Number(totalTime);
  }
  return { date, course, surface, splits: splitNums, totalSeconds: seconds, jockey };
}

// 解析試閘 line：
//   "11/05: 第4組 1000 從化 草地 3/10(呂聖澤) 13.8 21.8 23.6 (0.59.23)"
function parseTrialLine(line) {
  if (!line || !line.trim()) return null;
  const m = line.match(/(\d{1,2}\/\d{1,2}):\s*第(\d+)組\s+(\d+)\s+(\S+)\s+(\S+)\s+(\d+)\/(\d+)\(([^)]+)\)\s+([\d.\s]+?)\s*\(([\d.:]+)\)/);
  if (!m) return null;
  const [, date, group, distance, course, surface, place, fieldSize, jockey, splits, totalTime] = m;
  let seconds = 0;
  if (totalTime.includes('.')) {
    const parts = totalTime.split('.');
    if (parts.length === 3) seconds = Number(parts[0]) * 60 + Number(parts[1]) + Number(parts[2]) / 100;
    else seconds = Number(totalTime);
  }
  return {
    date, group: Number(group), distance: Number(distance),
    course, surface,
    place: Number(place), fieldSize: Number(fieldSize), jockey,
    splits: splits.trim().split(/\s+/).map(Number).filter(Number.isFinite),
    totalSeconds: seconds,
  };
}

// 解析踱步：日期 賽道 跑道 描述 (騎師)
//   "18/05: 沙田 內圈 倒快兩圈 (助手)"
function parseCanterLine(line) {
  if (!line || !line.trim()) return null;
  const m = line.match(/(\d{1,2}\/\d{1,2}):\s*(\S+)\s+(\S+)\s+(.+?)\s*(?:\(([^)]+)\))?$/);
  if (!m) return null;
  return {
    date: m[1], course: m[2], surface: m[3], description: m[4].trim(), jockey: m[5] || '',
  };
}

// 解析簡單日期+賽道：「15/05: 沙田」
function parseSimpleLine(line) {
  if (!line || !line.trim()) return null;
  const m = line.match(/(\d{1,2}\/\d{1,2}):\s*(\S+)/);
  return m ? { date: m[1], course: m[2] } : null;
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 Chrome/120 Safari/537.36');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));

  // 取得 venue（跑馬地 / 沙田）
  const venueText = await page.evaluate(() => {
    const t = [...document.querySelectorAll('table')][0];
    return t ? t.innerText.trim() : '';
  });
  const venue = venueText.includes('跑馬地') ? 'HV' : venueText.includes('沙田') ? 'ST' : '';

  // 取得日期（從頁面）
  const dateText = await page.evaluate(() => {
    const ts = [...document.querySelectorAll('h1, h2, h3, h4, .date, .race-date')];
    for (const t of ts) {
      const m = t.innerText.match(/(\d{4})[年\/-](\d{1,2})[月\/-](\d{1,2})/);
      if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    }
    // fallback：揾頁面 text
    const html = document.body.innerText;
    const m = html.match(/(\d{4})[年\/-](\d{1,2})[月\/-](\d{1,2})/);
    return m ? `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}` : '';
  });

  // 取所有 tables，揀 trackwork 表（rows >= 3 + header 包含「快操」）
  const tableData = await page.$$eval('table', els =>
    els.map(t => ({
      rows: [...t.rows].map(r => [...r.cells].map(c => c.innerText.trim()))
    }))
  );

  const horses = [];
  for (const t of tableData) {
    if (!t.rows.length) continue;
    const header = t.rows[0];
    if (!header.some(h => h.includes('快操'))) continue;

    // header columns: 編號 / 馬名 練馬師 6次近績 / 試閘 / 快操 / 踱步 / 游泳 / 馬匹跑步機 / 馬匹水中步行機 / 休歇 / 詳情
    const colIdx = {
      no: header.findIndex(h => h.includes('編號')),
      name: header.findIndex(h => h.includes('馬名')),
      trial: header.findIndex(h => h.includes('試閘')),
      gallop: header.findIndex(h => h.includes('快操')),
      canter: header.findIndex(h => h.includes('踱步')),
      swim: header.findIndex(h => h.includes('游泳')),
      treadmill: header.findIndex(h => h.includes('跑步機')),
      walker: header.findIndex(h => h.includes('步行機')),
      rest: header.findIndex(h => h.includes('休歇')),
    };

    for (let i = 1; i < t.rows.length; i++) {
      const row = t.rows[i];
      if (!row.length || !row[colIdx.no] || row[0] === '後備馬匹') continue;
      const nameBlock = row[colIdx.name] || '';
      const lines = nameBlock.split('\n');
      const horseName = lines[0]?.trim() || '';
      const trainer = lines[1]?.trim() || '';
      const last6 = lines[2]?.trim() || '';

      const splitMulti = (s) => (s||'').split(/\n/).map(x => x.trim()).filter(Boolean);

      horses.push({
        no: row[colIdx.no],
        name: horseName,
        trainer,
        last6,
        trials: splitMulti(row[colIdx.trial] || '').map(parseTrialLine).filter(Boolean),
        gallops: splitMulti(row[colIdx.gallop] || '').map(parseGallopLine).filter(Boolean),
        canters: splitMulti(row[colIdx.canter] || '').map(parseCanterLine).filter(Boolean),
        swims: splitMulti(row[colIdx.swim] || '').map(parseSimpleLine).filter(Boolean),
        treadmill: splitMulti(row[colIdx.treadmill] || '').map(s => s.trim()).filter(Boolean),
        walker: splitMulti(row[colIdx.walker] || '').map(s => s.trim()).filter(Boolean),
        rest: splitMulti(row[colIdx.rest] || '').map(s => s.trim()).filter(Boolean),
      });
    }
  }

  await browser.close();

  const out = { date: dateText, venue, fetchedAt: new Date().toISOString(), horses };
  const outPath = OUT || `d:/AI/Bet/data/misc/trackwork-${dateText || 'unknown'}.json`;
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Trackwork scraped: ${horses.length} horses for ${dateText} ${venue}`);
  console.log(`Wrote: ${outPath}`);
})();
