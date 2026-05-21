// DOM 偵察：看 bet.hkjc.com 載入後畫面上的賠率 DOM 結構
const puppeteer = require('puppeteer');

const DATE = process.env.DATE || '2026-05-13';
const VENUE = process.env.VENUE || 'HV';
const RACE_NO = process.env.RACE_NO || '1';
const URL = `https://bet.hkjc.com/ch/racing/wp/${DATE}/${VENUE}/${RACE_NO}`;

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();
  console.log('→', URL);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

  console.log('\n等待 10 秒讓賠率表渲染...');
  await new Promise((r) => setTimeout(r, 10000));

  const result = await page.evaluate(() => {
    const allText = document.body.innerText;
    const tables = [...document.querySelectorAll('table')].map((t, i) => ({
      idx: i,
      rows: [...t.querySelectorAll('tr')].map((tr) =>
        [...tr.querySelectorAll('td,th')].map((c) => c.innerText.trim()).filter(Boolean)
      ).filter((r) => r.length),
    }));

    const tablesWithOdds = tables.filter((t) =>
      t.rows.some((r) => r.some((c) => /^\d+\.\d{1,2}$/.test(c)))
    );

    const numbers = [...document.querySelectorAll('*')]
      .filter((el) => el.children.length === 0)
      .map((el) => el.innerText?.trim())
      .filter((t) => t && /^\d{1,3}(\.\d{1,2})?$/.test(t))
      .slice(0, 60);

    return {
      title: document.title,
      textSnippet: allText.slice(0, 600),
      tableCount: tables.length,
      tablesWithOdds: tablesWithOdds.slice(0, 3),
      numberSample: numbers,
    };
  });

  console.log('\n=== 頁面標題 ===\n', result.title);
  console.log('\n=== 文字片段 ===\n', result.textSnippet);
  console.log('\n=== 表格總數 ===', result.tableCount);
  console.log('\n=== 含賠率的表格（前 3 個）===');
  result.tablesWithOdds.forEach((t, i) => {
    console.log(`\n--- 表格 #${t.idx} ---`);
    t.rows.slice(0, 20).forEach((r) => console.log(' ', r.join(' | ')));
  });
  console.log('\n=== 數字取樣 ===\n', result.numberSample);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
