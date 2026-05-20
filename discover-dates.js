// discover-dates.js
// 探索 2024-2026 年所有 HKJC 賽馬日期、場地、場數
// 用法: node discover-dates.js
// 輸出: all-race-dates.json → [{ date, venue, raceCount }]

const fs = require('fs');
const puppeteer = require('puppeteer');
const paths = require('./paths');

const OUT = process.env.OUT || paths.miscPath('all-race-dates.json');
const START = process.env.START || '2024-01-01';
const END = process.env.END || '2026-05-15';
const HEADLESS = process.env.HEADLESS !== 'false';
const WAIT_MS = Number(process.env.WAIT_MS || 800);

// 生成候選日期：週三(HV)、週六(ST)、週日(ST)
// 香港賽馬規律：週三跑馬地、週六/日沙田（偶有例外，但先用此規律掃描）
function generateCandidates(start, end) {
  const candidates = [];
  const cur = new Date(start + 'T00:00:00Z');
  const endDate = new Date(end + 'T00:00:00Z');

  while (cur <= endDate) {
    const dow = cur.getUTCDay(); // 0=Sun, 1=Mon, ..., 3=Wed, 6=Sat
    const dateStr = cur.toISOString().slice(0, 10);

    if (dow === 3) {
      // 週三：先試 HV，再試 ST（偶有沙田週三）
      candidates.push([dateStr, 'HV']);
      candidates.push([dateStr, 'ST']);
    } else if (dow === 6) {
      // 週六：先試 ST，再試 HV
      candidates.push([dateStr, 'ST']);
      candidates.push([dateStr, 'HV']);
    } else if (dow === 0) {
      // 週日：先試 ST，再試 HV
      candidates.push([dateStr, 'ST']);
      candidates.push([dateStr, 'HV']);
    }

    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return candidates;
}

async function checkDate(page, date, venue) {
  const url = `https://racing.hkjc.com/racing/information/Chinese/Racing/LocalResults.aspx?RaceDate=${date.replace(/-/g, '/')}&Racecourse=${venue}&RaceNo=1`;
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, WAIT_MS));

    return await page.evaluate(() => {
      if (/沒有相關資料|No Information|no race/.test(document.body.innerText)) return null;
      const tables = [...document.querySelectorAll('table')];
      const hasResult = tables.some(
        (t) => /名次|Plc/.test(t.innerText) && /馬號|Horse No/.test(t.innerText),
      );
      if (!hasResult) return null;

      // 推斷最大場數：從 option 值和連結文字中找最大數字
      const options = [...document.querySelectorAll('option')]
        .map((o) => o.value)
        .filter((v) => /^\d+$/.test(v));
      const links = [...document.querySelectorAll('a')]
        .map((a) => a.innerText.trim())
        .filter((t) => /^\d+$/.test(t));
      const tds = [...document.querySelectorAll('td')]
        .map((td) => td.innerText.trim())
        .filter((t) => /^\d{1,2}$/.test(t));

      let max = 0;
      [...options, ...links, ...tds].forEach((x) => {
        const n = Number(x);
        if (n >= 1 && n <= 14 && n > max) max = n;
      });
      return max || 1;
    });
  } catch {
    return null;
  }
}

(async () => {
  // 載入已有結果（支援斷點續跑）
  let existing = [];
  const existingDates = new Set();
  if (fs.existsSync(OUT)) {
    existing = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    existing.forEach((r) => existingDates.add(r.date));
    console.log(`已有 ${existing.length} 個賽期，繼續探索剩餘日期`);
  }

  const candidates = generateCandidates(START, END);
  console.log(`候選日期組合：${candidates.length} 個（${START} 至 ${END}）`);

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 900 },
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
  );

  const found = [...existing];
  const checkedDates = new Set(existing.map((r) => r.date));
  let i = 0;

  for (const [date, venue] of candidates) {
    // 同一日期已確認有賽事，跳過同日其他場地
    if (checkedDates.has(date)) {
      i++;
      continue;
    }

    i++;
    process.stdout.write(`[${i}/${candidates.length}] ${date} ${venue} ... `);

    const raceCount = await checkDate(page, date, venue);

    if (raceCount) {
      found.push({ date, venue, raceCount });
      checkedDates.add(date);
      console.log(`✓ ${raceCount} 場`);
      // 每找到一個就儲存（斷點保護）
      fs.writeFileSync(OUT, JSON.stringify(found, null, 2), 'utf8');
    } else {
      console.log('無賽事');
    }

    // 小延遲避免被封
    await new Promise((r) => setTimeout(r, 300));
  }

  await browser.close();

  // 按日期排序
  found.sort((a, b) => a.date.localeCompare(b.date));
  fs.writeFileSync(OUT, JSON.stringify(found, null, 2), 'utf8');

  console.log(`\n完成！共找到 ${found.length} 個賽馬日`);
  console.log(`輸出：${OUT}`);

  // 統計
  const byYear = {};
  found.forEach(({ date }) => {
    const y = date.slice(0, 4);
    byYear[y] = (byYear[y] || 0) + 1;
  });
  Object.entries(byYear).forEach(([y, n]) => console.log(`  ${y}: ${n} 個賽期`));
})();
