const puppeteer = require('puppeteer');

const tests = [
  { label: 'RaceCard 2026-05-10 ST R1', url: 'https://racing.hkjc.com/racing/information/Chinese/Racing/RaceCard.aspx?RaceDate=2026/05/10&Racecourse=ST&RaceNo=1' },
  { label: 'RaceCard 2026-05-06 HV R1', url: 'https://racing.hkjc.com/racing/information/Chinese/Racing/RaceCard.aspx?RaceDate=2026/05/06&Racecourse=HV&RaceNo=1' },
  { label: 'RaceCard 2026-04-30 HV R1', url: 'https://racing.hkjc.com/racing/information/Chinese/Racing/RaceCard.aspx?RaceDate=2026/04/30&Racecourse=HV&RaceNo=1' },
  { label: 'RaceCard 2026-05-13 HV R1', url: 'https://racing.hkjc.com/racing/information/Chinese/Racing/RaceCard.aspx?RaceDate=2026/05/13&Racecourse=HV&RaceNo=1' },
  { label: 'RaceCard 2025-12-01 ST R1', url: 'https://racing.hkjc.com/racing/information/Chinese/Racing/RaceCard.aspx?RaceDate=2025/12/01&Racecourse=ST&RaceNo=1' },
];

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36');
  for (const t of tests) {
    console.log('\n=== ' + t.label + ' ===');
    console.log(t.url);
    try {
      const res = await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 45000 });
      await new Promise(r => setTimeout(r, 1500));
      const info = await page.evaluate(() => {
        const text = document.body.innerText;
        const title = document.title;
        const hasRaceCard = /排位表|Race Card/.test(text);
        const hasHorseNo = /馬號|Horse No/.test(text);
        const tables = [...document.querySelectorAll('table')];
        const runnerTable = tables.find(t => /馬號|Horse No/.test(t.innerText));
        const runnerRows = runnerTable ? runnerTable.querySelectorAll('tr').length : 0;
        const finalUrl = location.href;
        const preview = text.slice(0, 400).replace(/\s+/g,' ');
        return { title, hasRaceCard, hasHorseNo, runnerRows, finalUrl, preview };
      });
      console.log('status:', res.status(), '| title:', info.title);
      console.log('hasRaceCard:', info.hasRaceCard, '| hasHorseNo:', info.hasHorseNo, '| runnerRows:', info.runnerRows);
      console.log('finalUrl:', info.finalUrl);
      console.log('preview:', info.preview);
    } catch (err) {
      console.log('error:', err.message);
    }
  }
  await browser.close();
})();
