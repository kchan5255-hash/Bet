const puppeteer = require('puppeteer');

// 賽期表頁面
const url = 'https://racing.hkjc.com/racing/information/Chinese/Racing/Fixture.aspx';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36');
  console.log('=== Fixture ===');
  const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 1500));
  const data = await page.evaluate(() => {
    const text = document.body.innerText;
    const tables = [...document.querySelectorAll('table')];
    const out = [];
    for (const t of tables) {
      const txt = t.innerText;
      if (/跑馬地|沙田|HV|ST/.test(txt) && /\d{4}/.test(txt)) {
        out.push(txt.slice(0, 2000));
      }
    }
    return { title: document.title, tableCount: tables.length, tables: out };
  });
  console.log('status:', res.status(), '| title:', data.title);
  console.log('fixture tables:', data.tables.length);
  data.tables.forEach((t, i) => {
    console.log('\n--- table ' + i + ' ---');
    console.log(t);
  });
  await browser.close();
})();
