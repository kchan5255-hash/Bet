const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://racing.hkjc.com/racing/information/Chinese/Racing/LocalResults.aspx?RaceDate=2026/05/13&Racecourse=HV&RaceNo=1', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 1500));

  const data = await page.evaluate(() => {
    const text = document.body.innerText;
    const tables = [...document.querySelectorAll('table')];
    const out = [];
    tables.forEach((t, idx) => {
      const txt = t.innerText;
      if (/獨贏|位置|連贏|位置Q|三重彩|單T|四連環|派彩/i.test(txt)) {
        out.push({ idx, text: txt.slice(0, 800).replace(/\t/g, '|') });
      }
    });
    return { out, fullTextLen: text.length };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
