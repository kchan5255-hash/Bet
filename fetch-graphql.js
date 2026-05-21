// fetch-graphql.js
// 用純 fetch（無 puppeteer）抓 HKJC GraphQL raceMeetings → data/misc/graphql-race-data.json
//
// 用法：
//   DATE=2026-05-21 VENUE=ST node fetch-graphql.js

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const DATE = process.env.DATE || new Date().toISOString().slice(0, 10);
const VENUE = process.env.VENUE || 'ST';

const ENDPOINT = 'https://info.cld.hkjc.com/graphql/base/';
const QUERY_FILE = path.join(__dirname, '.graphql-query-cache.txt');
if (!fs.existsSync(QUERY_FILE)) {
  console.error(`Missing ${QUERY_FILE}. Run scrape-racecard-multi.js once to seed it.`);
  process.exit(1);
}
const QUERY = fs.readFileSync(QUERY_FILE, 'utf8');

(async () => {
  const body = {
    operationName: 'raceMeetings',
    variables: { date: DATE, venueCode: VENUE },
    query: QUERY,
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
      'Origin': 'https://bet.hkjc.com',
      'Referer': 'https://bet.hkjc.com/',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
    process.exit(1);
  }

  const json = await res.json();
  if (!json?.data?.raceMeetings?.length) {
    console.error('No raceMeetings in response');
    console.error(JSON.stringify(json, null, 2).slice(0, 1000));
    process.exit(1);
  }

  // 包成與 scrape-racecard-multi 一致的格式：[{type:'request',...},{type:'response',...}]
  const out = [
    { type: 'request', url: ENDPOINT, query: body },
    { type: 'response', url: ENDPOINT, data: json },
  ];

  const outPath = paths.miscPath('graphql-race-data.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

  const m = json.data.raceMeetings[0];
  console.log(`Wrote ${outPath}`);
  console.log(`raceMeetings: ${m.date} ${m.venueCode} - ${m.races?.length || 0} 場`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
