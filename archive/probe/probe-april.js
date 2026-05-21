const puppeteer = require('puppeteer');
const tests = [
  { d: '2026-04-22', v: 'HV' },
  { d: '2026-04-19', v: 'ST' },
  { d: '2026-04-15', v: 'HV' },
  { d: '2026-04-12', v: 'ST' },
  { d: '2026-04-08', v: 'HV' },
  { d: '2026-04-05', v: 'ST' },
  { d: '2026-04-01', v: 'HV' },
  { d: '2026-03-29', v: 'ST' },
  { d: '2026-03-25', v: 'HV' },
];
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 Chrome/120 Safari/537.36');
  for (const t of tests) {
    const url = `https://racing.hkjc.com/racing/information/Chinese/Racing/LocalResults.aspx?RaceDate=${t.d.replace(/-/g,'/')}&Racecourse=${t.v}&RaceNo=1`;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 800));
      const has = await page.evaluate(() => {
        const txt = document.body.innerText;
        if (/沒有相關資料|No Information/.test(txt)) return false;
        const tables = [...document.querySelectorAll('table')];
        return tables.some(tt => /名次|Plc/.test(tt.innerText) && /馬號|Horse No/.test(tt.innerText));
      });
      // try to read race count from select
      const rcCount = await page.evaluate(() => {
        const links = [...document.querySelectorAll('a, td')].map(a=>a.innerText.trim()).filter(t => /^\d+$/.test(t));
        const max = Math.max(0, ...links.map(Number).filter(n => n <= 12));
        return max;
      });
      console.log(t.d, t.v, 'has?', has, 'maxRace?', rcCount);
    } catch(e) {
      console.log(t.d, t.v, 'err', e.message);
    }
  }
  await browser.close();
})();
