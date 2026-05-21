const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36');
  for (const venue of ['ST','HV']) {
    const url = `https://racing.hkjc.com/racing/information/Chinese/Racing/RaceCard.aspx?RaceDate=2026/05/17&Racecourse=${venue}&RaceNo=1`;
    try {
      const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      const info = await page.evaluate(() => {
        const txt = document.body.innerText;
        return {
          title: document.title,
          hasRaceCard: /排位表|Race Card/.test(txt),
          hasNoMatch: /無相關紀錄|No matching/.test(txt),
          first300: txt.slice(0, 300)
        };
      });
      console.log(venue, 'status:', res.status());
      console.log('  hasRaceCard:', info.hasRaceCard, ' hasNoMatch:', info.hasNoMatch);
      console.log('  first:', info.first300.replace(/\n/g,' | '));
    } catch(e) { console.log(venue, 'err:', e.message); }
  }
  await browser.close();
})();
