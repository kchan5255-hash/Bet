// batch-horse-scraper.js
// 從所有 results-full-*.json 提取馬匹 code，批量爬取每匹馬的往績
// 同時寫入 horses-all.json 和 Supabase horse_records 表
//
// 用法:
//   node batch-horse-scraper.js
//   CONCURRENCY=8 node batch-horse-scraper.js
//   SKIP_EXISTING=false node batch-horse-scraper.js  ← 強制重新爬取所有馬

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const paths = require('./paths');

const OUT_FILE     = process.env.OUT_FILE     || paths.horsesWritePath('horses-all.json');
const CONCURRENCY  = Number(process.env.CONCURRENCY || 6);
const SKIP_EXISTING = process.env.SKIP_EXISTING !== 'false';
const HEADLESS     = process.env.HEADLESS     !== 'false';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// 從所有 results-full-*.json 收集唯一馬匹 code
function collectHorseCodes() {
  const codes = new Map(); // code → name（取最後一次出現的名字）
  const files = [];
  const resultsRoot = paths.DIRS.results;
  if (fs.existsSync(resultsRoot)) {
    for (const year of fs.readdirSync(resultsRoot)) {
      const yearDir = path.join(resultsRoot, year);
      if (!fs.statSync(yearDir).isDirectory()) continue;
      for (const f of fs.readdirSync(yearDir)) {
        if (/^results-full-\d{4}-\d{2}-\d{2}\.json$/.test(f)) {
          files.push(path.join(yearDir, f));
        }
      }
    }
  }
  // 兼容根目錄殘留檔
  for (const f of fs.readdirSync('.')) {
    if (/^results-full-\d{4}-\d{2}-\d{2}\.json$/.test(f)) files.push(path.resolve(f));
  }
  files.sort();
  console.log(`找到 ${files.length} 個 results-full-*.json 檔案`);

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      (data.races || []).forEach((race) => {
        (race.runners || []).forEach((r) => {
          if (r.code) codes.set(r.code, r.name || codes.get(r.code) || '');
        });
      });
    } catch {
      // 忽略損壞的檔案
    }
  }
  return codes;
}

async function scrapeHorse(browser, code, name) {
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
          .filter((row) => row.length >= 13 && /^\d+$/.test(row[0]))
          .map((row) => ({
            place:      row[1],
            date:       row[2],
            track:      row[3],
            distance:   row[4],
            going:      row[5],
            classNo:    row[6],
            draw:       row[7],
            rating:     row[8],
            trainer:    row[9],
            jockey:     row[10],
            lbw:        row[11],
            odds:       row[12],
            actWt:      row[13] || '',
            bodyWeight: row[16] || '',
          }));
      }
      return { profile, records };
    });

    await page.close();
    return { code, name, ...data };
  } catch (err) {
    await page.close().catch(() => {});
    return { code, name, profile: {}, records: [], error: err.message };
  }
}

async function upsertToSupabase(horse) {
  const scrapedAt = new Date().toISOString();

  // 儲存馬匹檔案
  if (horse.profile && Object.keys(horse.profile).length) {
    const p = horse.profile;
    const ageMatch = (p['Country of Origin / Age'] || '').match(/\/\s*(\d+)/);
    const colourSex = (p['Colour / Sex'] || '').split('/').map((s) => s.trim());
    const startsMatch = (p['No. of 1-2-3-Starts*'] || p['No. of starts in past 10 race meetings'] || '').match(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/);

    const profileRow = {
      horse_code:    horse.code,
      horse_name:    horse.name || null,
      english_name:  p['Horse Name (English)'] || null,
      country_origin: (p['Country of Origin / Age'] || '').split('/')[0]?.trim() || null,
      age:           ageMatch ? Number(ageMatch[1]) : null,
      colour:        colourSex[0] || null,
      sex:           colourSex[1] || null,
      sire:          p['Sire'] || null,
      dam:           p['Dam'] || null,
      total_starts:  startsMatch ? Number(startsMatch[4]) : null,
      wins:          startsMatch ? Number(startsMatch[1]) : null,
      seconds:       startsMatch ? Number(startsMatch[2]) : null,
      thirds:        startsMatch ? Number(startsMatch[3]) : null,
      current_trainer: p['Trainer'] || null,
      current_owner: p['Owner'] || null,
      total_stakes:  p['Total Stakes*'] || null,
      raw_profile:   p,
      scraped_at:    scrapedAt,
    };

    const { error: profileErr } = await supabase
      .from('horse_profiles')
      .upsert(profileRow, { onConflict: 'horse_code' });
    if (profileErr) console.error(`  Profile upsert error [${horse.code}]:`, profileErr.message);
  }

  // 儲存往績
  if (!horse.records.length) return;

  const rows = horse.records
    .filter((r) => r.date && r.track)
    .map((r) => {
      let raceDate = null;
      const dm = r.date.match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
      if (dm) {
        const year = dm[3].length === 2 ? '20' + dm[3] : dm[3];
        raceDate = `${year}-${dm[2]}-${dm[1]}`;
      }

      return {
        horse_code:  horse.code,
        horse_name:  horse.name  || null,
        place:       r.place     || null,
        race_date:   raceDate,
        track:       r.track     || null,
        distance:    Number(r.distance) || null,
        going:       r.going     || null,
        class_no:    r.classNo   || null,
        draw:        r.draw      || null,
        rating:      r.rating    || null,
        trainer:     r.trainer   || null,
        jockey:      r.jockey    || null,
        lbw:         r.lbw       || null,
        odds:        r.odds      || null,
        act_wt:      r.actWt     || null,
        body_weight: r.bodyWeight || null,
        scraped_at:  scrapedAt,
      };
    })
    .filter((r) => r.race_date && r.distance);

  if (!rows.length) return;

  const { error } = await supabase
    .from('horse_records')
    .upsert(rows, { onConflict: 'horse_code,race_date,distance' });
  if (error) console.error(`  Supabase upsert error [${horse.code}]:`, error.message);
}

(async () => {
  // 收集所有馬匹 code
  const allCodes = collectHorseCodes();
  console.log(`共找到 ${allCodes.size} 匹唯一馬匹`);

  // 載入已有往績（支援斷點續跑）
  let existing = { scrapedAt: null, horses: [] };
  const doneCodes = new Set();

  if (fs.existsSync(OUT_FILE)) {
    existing = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    existing.horses.forEach((h) => {
      if (SKIP_EXISTING) doneCodes.add(h.code);
    });
    console.log(`已有 ${existing.horses.length} 匹馬往績，跳過已完成的`);
  }

  const pending = [...allCodes.entries()].filter(([code]) => !doneCodes.has(code));
  console.log(`待爬取：${pending.length} 匹`);

  if (!pending.length) {
    console.log('所有馬匹往績已是最新，無需爬取');
    process.exit(0);
  }

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const horses = [...existing.horses];
  let cursor = 0;
  let completed = 0;

  async function worker() {
    while (cursor < pending.length) {
      const [code, name] = pending[cursor++];
      const data = await scrapeHorse(browser, code, name);
      horses.push(data);
      completed++;

      process.stdout.write(
        `\r[${completed}/${pending.length}] ${code} (${name}) records=${data.records?.length ?? 0}${data.error ? ' ERR' : ''}   `,
      );

      await upsertToSupabase(data);

      // 每 20 匹儲存一次（斷點保護）
      if (completed % 20 === 0) {
        fs.writeFileSync(
          OUT_FILE,
          JSON.stringify({ scrapedAt: new Date().toISOString(), horses }, null, 2),
          'utf8',
        );
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log('');

  await browser.close();

  fs.writeFileSync(
    OUT_FILE,
    JSON.stringify({ scrapedAt: new Date().toISOString(), horses }, null, 2),
    'utf8',
  );
  console.log(`\n完成！共 ${horses.length} 匹馬往績`);
  console.log(`輸出：${OUT_FILE}`);
})();
