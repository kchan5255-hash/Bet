const fs = require('fs');
const https = require('https');
const path = require('path');

const OUT = process.env.OUTPUT_FILE || 'web/src/data/dividends-by-date.json';

const venueName = (v) => (v === 'HV' ? '跑馬地' : v === 'ST' ? '沙田' : v);

function fetchUrl(url, depth = 0) {
  return new Promise((resolve, reject) => {
    if (depth > 5) return reject(new Error('too many redirects'));
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const next = new URL(res.headers.location, url).toString();
          res.resume();
          resolve(fetchUrl(next, depth + 1));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      })
      .on('error', reject);
  });
}

function parseDividends(html) {
  const tabIndex = html.indexOf('class="dividend_tab');
  if (tabIndex < 0) return [];
  const tbodyStart = html.indexOf('<tbody>', tabIndex);
  const tbodyEnd = html.indexOf('</tbody>', tbodyStart);
  if (tbodyStart < 0 || tbodyEnd < 0) return [];
  const segment = html.slice(tbodyStart, tbodyEnd);
  const rows = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m;
  let currentPool = '';
  while ((m = rowRe.exec(segment)) !== null) {
    const tr = m[1];
    const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) =>
      x[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim(),
    );
    if (tds.length === 0) continue;
    if (tds.length === 3) {
      currentPool = tds[0];
      rows.push({ pool: tds[0], combo: tds[1], dividend: tds[2] });
    } else if (tds.length === 2) {
      rows.push({ pool: currentPool, combo: tds[0], dividend: tds[1] });
    }
  }
  return rows.filter((r) => r.combo && r.dividend);
}

async function scrapeDate(date, venue, raceCount) {
  const races = [];
  for (let raceNo = 1; raceNo <= raceCount; raceNo++) {
    const url = `https://racing.hkjc.com/racing/information/Chinese/Racing/LocalResults.aspx?RaceDate=${date.replace(/-/g, '/')}&Racecourse=${venue}&RaceNo=${raceNo}`;
    let dividends = [];
    try {
      const html = await fetchUrl(url);
      dividends = parseDividends(html);
    } catch (e) {
      process.stderr.write(`[${date} R${raceNo}] error: ${e.message}\n`);
    }
    races.push({ raceNo, dividends });
  }
  return races;
}

(async () => {
  const meta = JSON.parse(
    fs.readFileSync('web/src/data/race-results-by-date.json', 'utf8'),
  );
  const out = { dates: meta.dates.map((d) => d.date), byDate: {} };

  let i = 0;
  for (const d of meta.dates) {
    i++;
    const races = await scrapeDate(d.date, d.venue, d.raceCount);
    const totalRows = races.reduce((s, r) => s + r.dividends.length, 0);
    process.stderr.write(
      `[${i}/${meta.dates.length}] ${d.date} ${d.venue} (${d.raceCount} races) -> ${totalRows} dividend rows\n`,
    );
    out.byDate[d.date] = {
      date: d.date,
      venue: d.venue,
      venueName: venueName(d.venue),
      races,
    };
  }

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  process.stderr.write(`written ${OUT}\n`);
})();
