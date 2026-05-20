const puppeteer = require('puppeteer');
const fs = require('fs');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36');
  const url = 'https://racing.hkjc.com/racing/information/Chinese/Racing/RaceCard.aspx?RaceDate=2026/05/09&Racecourse=ST&RaceNo=1';
  console.log('GET', url);
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('status:', res.status());
  await new Promise(r => setTimeout(r, 1500));
  const info = await page.evaluate(() => {
    const txt = document.body.innerText;
    const tables = document.querySelectorAll('table').length;
    const hasRating = /\b評分|Rating\b/.test(txt);
    const hasLast6 = /近6/.test(txt);
    return {
      title: document.title,
      bodyLen: txt.length,
      tables,
      hasRating,
      hasLast6,
      noMatch: /無相關資料/.test(txt),
      first500: txt.slice(0, 500),
    };
  });
  console.log(info);
  await page.screenshot({ path: 'd:/AI/Bet/probe-509-rc.png', fullPage: false });
  await browser.close();
})();
