const puppeteer = require('puppeteer');

// 探查歷史賽果可用性
const tests = [
  { label: '2026-05-10 ST', url: 'https://racing.hkjc.com/racing/information/Chinese/Racing/LocalResults.aspx?RaceDate=2026/05/10&Racecourse=ST&RaceNo=1' },
  { label: '2026-05-07 HV', url: 'https://racing.hkjc.com/racing/information/Chinese/Racing/LocalResults.aspx?RaceDate=2026/05/07&Racecourse=HV&RaceNo=1' },
  { label: '2026-05-06 HV', url: 'https://racing.hkjc.com/racing/information/Chinese/Racing/LocalResults.aspx?RaceDate=2026/05/06&Racecourse=HV&RaceNo=1' },
  { label: '2026-05-03 ST', url: 'https://racing.hkjc.com/racing/information/Chinese/Racing/LocalResults.aspx?RaceDate=2026/05/03&Racecourse=ST&RaceNo=1' },
];

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36');
  for (const t of tests) {
    console.log('\n=== ' + t.label + ' ===');
    try {
      const res = await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 45000 });
      await new Promise(r => setTimeout(r, 1200));
      const info = await page.evaluate(() => {
        const text = document.body.innerText;
        const tables = [...document.querySelectorAll('table')];
        const resultTable = tables.find(t => /名次|Plc/.test(t.innerText) && /馬號|Horse No/.test(t.innerText));
        const row0 = resultTable ? resultTable.querySelectorAll('tr').length : 0;
        const dropdown = document.querySelector('select[name*="Race"]');
        const raceOptions = dropdown ? [...dropdown.options].map(o => o.value + '=' + o.text) : [];
        const hasNoData = /沒有相關資料|No Information/.test(text);
        return { rowCount: row0, hasResultTable: !!resultTable, hasNoData, raceOptionsCount: raceOptions.length };
      });
      console.log('status:', res.status(), '| hasResultTable:', info.hasResultTable, '| rows:', info.rowCount, '| hasNoData:', info.hasNoData, '| raceOptions:', info.raceOptionsCount);
    } catch (err) {
      console.log('error:', err.message);
    }
  }
  await browser.close();
})();
