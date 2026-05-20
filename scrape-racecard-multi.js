// scrape-racecard-multi.js
// 多 race 抓 race card 用，產出 graphql-race-data.json（覆寫）。
// 專門給未來日期 / 多場用，不依賴 hkjc bet.com 那邊的 SPA loading。
//
// 用法：
//   DATE=2026-05-17 VENUE=ST node scrape-racecard-multi.js
// 預設抓 race 1 的 raceMeetings 即可（因為 raceMeetings 包含當日全部場次）。

const puppeteer = require('puppeteer');
const fs = require('fs');
const paths = require('./paths');

const DATE = process.env.DATE || '2026-05-17';
const VENUE = process.env.VENUE || 'ST';
const HEADLESS = process.env.HEADLESS !== 'false';

(async () => {
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 900 },
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
  );

  const graphqlData = [];

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().includes('graphql') || req.url().includes('/graph')) {
      const post = req.postData();
      if (post) {
        try {
          const body = JSON.parse(post);
          if (/race|horse|runner/i.test(JSON.stringify(body))) {
            graphqlData.push({ type: 'request', url: req.url(), query: body });
          }
        } catch (_) {}
      }
    }
    req.continue();
  });

  page.on('response', async (res) => {
    if (res.url().includes('graphql') || res.url().includes('/graph')) {
      try {
        const json = await res.json();
        if (/race|horse|runner/i.test(JSON.stringify(json))) {
          graphqlData.push({ type: 'response', url: res.url(), data: json });
        }
      } catch (_) {}
    }
  });

  const url = `https://bet.hkjc.com/ch/racing/home/${DATE}/${VENUE}/1`;
  console.log('開啟:', url);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  const meeting = graphqlData.find((x) => x.data?.data?.raceMeetings);
  if (!meeting) {
    console.error('未抓到 raceMeetings GraphQL 回應');
    console.log('嘗試重整...');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 4000));
  }

  const out = paths.miscPath('graphql-race-data.json');
  fs.writeFileSync(out, JSON.stringify(graphqlData, null, 2));
  console.log(`寫入 ${graphqlData.length} 筆 → ${out}`);

  const found = graphqlData.find((x) => x.data?.data?.raceMeetings);
  if (found) {
    const m = found.data.data.raceMeetings[0];
    console.log(`raceMeetings: ${m?.date} ${m?.venueCode} - ${m?.races?.length || 0} 場`);
  } else {
    console.warn('未找到 raceMeetings 欄位！可能是場地或日期不對。');
  }

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
