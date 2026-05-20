// 偵察 HKJC 賠率網路協議
// 用法：node odds-probe.js
const puppeteer = require('puppeteer');

const DATE = process.env.DATE || '2026-05-13';
const VENUE = process.env.VENUE || 'HV';
const RACE_NO = process.env.RACE_NO || '1';
const URL = `https://bet.hkjc.com/ch/racing/wp/${DATE}/${VENUE}/${RACE_NO}`;

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();
  const cdp = await page.target().createCDPSession();
  await cdp.send('Network.enable');

  const seenWs = new Set();
  const xhrLog = [];

  cdp.on('Network.webSocketCreated', ({ url }) => {
    if (!seenWs.has(url)) {
      seenWs.add(url);
      console.log('\n[WS CREATED]', url);
    }
  });

  cdp.on('Network.webSocketFrameReceived', ({ response }) => {
    const payload = response.payloadData || '';
    if (payload.length > 200) {
      console.log('\n[WS RECV]', payload.slice(0, 400), '...');
    } else if (payload.trim()) {
      console.log('\n[WS RECV]', payload);
    }
  });

  cdp.on('Network.webSocketFrameSent', ({ response }) => {
    const payload = response.payloadData || '';
    if (payload.trim()) {
      console.log('\n[WS SENT]', payload.slice(0, 300));
    }
  });

  page.on('response', async (res) => {
    const url = res.url();
    const type = res.request().resourceType();
    if (!['xhr', 'fetch'].includes(type)) return;
    if (/\.(png|jpg|gif|svg|css|woff|woff2|ico)(\?|$)/.test(url)) return;

    const looksOdds =
      /odds|pool|win|pla|race|bet|pm/i.test(url) &&
      !/sentry|telemetry|analytics|gtm|googletagmanager/i.test(url);
    if (!looksOdds) return;

    try {
      const body = await res.text();
      if (body.length < 30) return;
      const preview = body.slice(0, 300).replace(/\s+/g, ' ');
      xhrLog.push({ url, status: res.status(), preview });
      console.log(`\n[XHR] ${res.status()} ${url}\n  → ${preview}`);
    } catch (_) {}
  });

  console.log(`\n→ 導航：${URL}\n`);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

  console.log('\n=== 已載入，等待 20 秒觀察即時流量 ===\n');
  await new Promise((r) => setTimeout(r, 20000));

  console.log('\n=== 匯總 ===');
  console.log('WebSocket URLs:');
  seenWs.forEach((u) => console.log(' -', u));
  console.log('\nTop XHR:');
  xhrLog.slice(0, 15).forEach((x) => console.log(` - [${x.status}] ${x.url}`));

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
