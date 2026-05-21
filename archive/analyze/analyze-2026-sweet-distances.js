// analyze-2026-sweet-distances.js
// 2026 年 V14 picks 喺 1200/1400/1600 嘅每日 / 月度詳情

const fs = require('fs');
const path = require('path');

const ROOT = 'd:/AI/Bet';
const STAKE = 100;
const ALLOWED = [1200, 1400, 1600];

function loadDiv(d) {
  const f = path.join(ROOT, 'data/dividends/' + d.slice(0,4) + '/dividends-' + d + '.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f,'utf8')) : null;
}
function findPay(div, raceNo, pair, type) {
  if (!div) return 0;
  const r = div.races.find(x => x.raceNo === raceNo);
  if (!r) return 0;
  const list = r.dividends?.[type] || [];
  const k = pair.slice().sort().join(',');
  for (const d of list) if (d.combo.split(',').sort().join(',') === k) return d.amount;
  return 0;
}

const dir = path.join(ROOT, 'data/backtest/v14/2026');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();

const days = [];
for (const f of files) {
  const m = f.match(/(\d{4}-\d{2}-\d{2})/);
  if (!m) continue;
  const date = m[1];
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const div = loadDiv(date);

  const dayRaces = [];
  for (const race of data.races) {
    if (!race.recommend?.bets?.length || !race.actualTop3 || race.actualTop3.length < 3) continue;
    const dist = Number(race.meta?.distance);
    if (!ALLOWED.includes(dist)) continue;
    const top2 = race.actualTop3.slice(0, 2);
    const top3 = race.actualTop3;
    const banker = race.recommend.bets.flatMap(b => [[b.t1, b.t2], [b.t1, b.t3]].filter(p => p[1]));
    const t12 = race.recommend.qinT12.combo.split(',');
    const inT2 = n => top2.includes(n);
    const inT3 = n => top3.includes(n);
    const p2 = p => inT2(p[0]) && inT2(p[1]);
    const p3 = p => inT3(p[0]) && inT3(p[1]);

    const sHit = p2(t12);
    const bHit = banker.some(p2);
    const pqH = banker.filter(p3);
    const qPay = (sHit||bHit) ? findPay(div, race.raceNo, top2, '連贏') : 0;
    let pqPay = 0;
    for (const p of pqH) pqPay += findPay(div, race.raceNo, p, '位置Q');

    const sP = (sHit ? qPay*STAKE/10 : 0) - STAKE;
    const bP = (bHit ? qPay*STAKE/10 : 0) - STAKE * banker.length;
    const pP = (pqPay*STAKE/10) - STAKE * banker.length;

    dayRaces.push({
      raceNo: race.raceNo,
      dist,
      cls: race.meta?.className || '',
      pick: race.recommend.qinT12.label,
      actualTop3: race.actualTop3.join('-'),
      sHit, bHit, pqHit: pqH.length > 0,
      sP, bP, pP,
      bn: banker.length,
    });
  }

  if (dayRaces.length) {
    days.push({
      date,
      venue: data.venue || '',
      n: dayRaces.length,
      races: dayRaces,
      sPnl: dayRaces.reduce((s,r) => s+r.sP, 0),
      bPnl: dayRaces.reduce((s,r) => s+r.bP, 0),
      pPnl: dayRaces.reduce((s,r) => s+r.pP, 0),
      sHits: dayRaces.filter(r => r.sHit).length,
      bHits: dayRaces.filter(r => r.bHit).length,
      pqHits: dayRaces.filter(r => r.pqHit).length,
    });
  }
}

const fmt = (v) => v >= 0 ? `+$${Math.round(v).toLocaleString()}` : `-$${Math.abs(Math.round(v)).toLocaleString()}`;

console.log('# V14 + 距離 1200/1400/1600 — 2026 年逐日輸贏');
console.log(`資料：${days.length} 個賽馬日 / ${days.reduce((s,d)=>s+d.n,0)} 場`);
console.log();

console.log('## 每日表');
console.log('| 日期 | 場 | 中(連) | 中(位Q) | 連贏單注 | 連贏膽拖 | 位Q膽拖 | 累計連贏單 | 累計連贏膽 | 累計位Q膽 |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
let cumS = 0, cumB = 0, cumP = 0;
for (const d of days) {
  cumS += d.sPnl; cumB += d.bPnl; cumP += d.pPnl;
  console.log(`| ${d.date} | ${d.n} | ${d.bHits} | ${d.pqHits} | ${fmt(d.sPnl)} | ${fmt(d.bPnl)} | ${fmt(d.pPnl)} | ${fmt(cumS)} | ${fmt(cumB)} | ${fmt(cumP)} |`);
}

console.log();
console.log('## 月度合計');
console.log('| 月 | 賽日 | 場 | 連贏單注命中 | 連贏中率 | 連贏單注 | 連贏膽拖 | 位Q膽拖 |');
console.log('|---|---|---|---|---|---|---|---|');
const byMonth = {};
for (const d of days) {
  const ym = d.date.slice(0, 7);
  if (!byMonth[ym]) byMonth[ym] = [];
  byMonth[ym].push(d);
}
for (const ym of Object.keys(byMonth).sort()) {
  const ds = byMonth[ym];
  const n = ds.reduce((s,x)=>s+x.n,0);
  const sH = ds.reduce((s,x)=>s+x.sHits,0);
  const bH = ds.reduce((s,x)=>s+x.bHits,0);
  const sP = ds.reduce((s,x)=>s+x.sPnl,0);
  const bP = ds.reduce((s,x)=>s+x.bPnl,0);
  const pP = ds.reduce((s,x)=>s+x.pPnl,0);
  console.log(`| ${ym} | ${ds.length} | ${n} | ${bH} | ${(bH/n*100).toFixed(1)}% | ${fmt(sP)} | ${fmt(bP)} | ${fmt(pP)} |`);
}

console.log();
console.log('## 每場詳情（每日逐場）');
for (const d of days) {
  console.log(`\n### ${d.date} ${d.venue} (${d.n} 場)`);
  console.log('| Race | 距離 | 班 | V14 推介 | 實際 Top3 | 連 | 位Q |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of d.races) {
    const conn = r.bHit ? '✓' : '✗';
    const pq = r.pqHit ? '✓' : '✗';
    console.log(`| R${r.raceNo} | ${r.dist}m | ${r.cls} | ${r.pick} | ${r.actualTop3} | ${conn} | ${pq} |`);
  }
  console.log(`日結：連贏單 ${fmt(d.sPnl)} / 連贏膽 ${fmt(d.bPnl)} / 位Q膽 ${fmt(d.pPnl)}`);
}

console.log();
console.log('## 總計');
const tN = days.reduce((s,x)=>s+x.n,0);
const tS = days.reduce((s,x)=>s+x.sPnl,0);
const tB = days.reduce((s,x)=>s+x.bPnl,0);
const tP = days.reduce((s,x)=>s+x.pPnl,0);
const tsH = days.reduce((s,x)=>s+x.sHits,0);
const tbH = days.reduce((s,x)=>s+x.bHits,0);
const tpH = days.reduce((s,x)=>s+x.pqHits,0);
console.log(`場數: ${tN}`);
console.log(`連贏單注：中 ${tsH}/${tN} (${(tsH/tN*100).toFixed(1)}%) / 流轉 $${(tN*STAKE).toLocaleString()} / pnl ${fmt(tS)} / ROI ${(tS/(tN*STAKE)*100).toFixed(1)}%`);
console.log(`連贏膽拖：中 ${tbH}/${tN} (${(tbH/tN*100).toFixed(1)}%) / 流轉 $${(tN*STAKE*2).toLocaleString()} / pnl ${fmt(tB)} / ROI ${(tB/(tN*STAKE*2)*100).toFixed(1)}%`);
console.log(`位Q膽拖：中 ${tpH}/${tN} (${(tpH/tN*100).toFixed(1)}%) / 流轉 $${(tN*STAKE*2).toLocaleString()} / pnl ${fmt(tP)} / ROI ${(tP/(tN*STAKE*2)*100).toFixed(1)}%`);

console.log();
console.log('## 距離分拆');
const byDist = { 1200: [], 1400: [], 1600: [] };
for (const d of days) for (const r of d.races) byDist[r.dist].push(r);
console.log('| 距離 | 場 | 中(連) | 中率 | 連贏單注 | 連贏膽拖 | 位Q膽拖 |');
console.log('|---|---|---|---|---|---|---|');
for (const dist of [1200, 1400, 1600]) {
  const rs = byDist[dist];
  if (!rs.length) continue;
  const sH = rs.filter(r => r.sHit).length;
  const bH = rs.filter(r => r.bHit).length;
  const sP = rs.reduce((s,x) => s+x.sP, 0);
  const bP = rs.reduce((s,x) => s+x.bP, 0);
  const pP = rs.reduce((s,x) => s+x.pP, 0);
  const sROI = sP / (rs.length * STAKE) * 100;
  const bROI = bP / rs.reduce((s,x) => s+x.bn*STAKE, 0) * 100;
  const pROI = pP / rs.reduce((s,x) => s+x.bn*STAKE, 0) * 100;
  console.log(`| ${dist}m | ${rs.length} | ${bH} | ${(bH/rs.length*100).toFixed(1)}% | ${fmt(sP)} (${sROI>=0?'+':''}${sROI.toFixed(1)}%) | ${fmt(bP)} (${bROI>=0?'+':''}${bROI.toFixed(1)}%) | ${fmt(pP)} (${pROI>=0?'+':''}${pROI.toFixed(1)}%) |`);
}

fs.writeFileSync(path.join(ROOT, 'data/v14-sweet-2026-daily.json'), JSON.stringify(days, null, 2));
console.log('\nWrote data/v14-sweet-2026-daily.json');
