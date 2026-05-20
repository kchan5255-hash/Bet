const puppeteer = require('puppeteer');
// 探查 2026 年 1-3 月賽事
const guess = [
  // 3 月 — 假設每週三 HV + 週六/日 ST
  ['2026-03-22','ST'],['2026-03-18','HV'],['2026-03-15','ST'],['2026-03-11','HV'],
  ['2026-03-08','ST'],['2026-03-04','HV'],['2026-03-01','ST'],
  // 2 月
  ['2026-02-25','HV'],['2026-02-22','ST'],['2026-02-18','HV'],['2026-02-15','ST'],
  ['2026-02-11','HV'],['2026-02-08','ST'],['2026-02-04','HV'],['2026-02-01','ST'],
  // 1 月
  ['2026-01-28','HV'],['2026-01-25','ST'],['2026-01-21','HV'],['2026-01-18','ST'],
  ['2026-01-14','HV'],['2026-01-11','ST'],['2026-01-07','HV'],['2026-01-04','ST'],
  ['2026-01-01','ST']
];
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 Chrome/120');
  const found = [];
  for (const [d, v] of guess) {
    const url = `https://racing.hkjc.com/racing/information/Chinese/Racing/LocalResults.aspx?RaceDate=${d.replace(/-/g,'/')}&Racecourse=${v}&RaceNo=1`;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
      await new Promise(r=>setTimeout(r, 600));
      const has = await page.evaluate(() => {
        if (/沒有相關資料|No Information/.test(document.body.innerText)) return null;
        const tables = [...document.querySelectorAll('table')];
        if (!tables.some(t => /名次|Plc/.test(t.innerText) && /馬號|Horse No/.test(t.innerText))) return null;
        // 偵測共幾場
        const options = [...document.querySelectorAll('option')].map(o=>o.value).filter(v=>/^\d+$/.test(v));
        const links = [...document.querySelectorAll('a,td')].map(a=>a.innerText.trim()).filter(t=>/^\d+$/.test(t));
        let max = 0;
        [...options, ...links].forEach(x => { const n = +x; if (n>=1 && n<=12 && n>max) max = n; });
        return max || 1;
      });
      if (has) { found.push([d, v, has]); console.log(d, v, has+' 場'); }
      else console.log(d, v, '冇賽');
    } catch (e) { console.log(d, v, 'err'); }
  }
  console.log('\n找到:', found.length, '個賽馬日');
  const paths = require('./paths');
  require('fs').writeFileSync(paths.miscPath('jan-mar-days.json'), JSON.stringify(found), 'utf8');
  await browser.close();
})();
