// analyze-v14-middle-daily.js
// V14 base + Middle distance (1400-1600m) 每日 / 月度詳情

const fs = require('fs');
const path = require('path');

const ROOT = 'd:/AI/Bet';
const STAKE = 100;

function loadDiv(d) {
  const f = path.join(ROOT, 'data/dividends/' + d.slice(0,4) + '/dividends-' + d + '.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
}
function findPay(div, raceNo, pair, type) {
  if (!div) return 0;
  const r = div.races.find(x => x.raceNo === raceNo);
  if (!r) return 0;
  const list = r.dividends?.[type] || [];
  const k = pair.slice().sort().join(',');
  for (const d of list) {
    if (d.combo.split(',').sort().join(',') === k) return d.amount;
  }
  return 0;
}

// ===== 收齊 picks =====
const days = [];
for (const yr of ['2024','2025','2026']) {
  const dir = path.join(ROOT, 'data/backtest/v14/' + yr);
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/(\d{4}-\d{2}-\d{2})/);
    if (!m) continue;
    const date = m[1];
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const div = loadDiv(date);
    const dayRaces = [];
    for (const race of data.races) {
      if (!race.recommend?.bets?.length || !race.actualTop3 || race.actualTop3.length < 3) continue;
      const dist = Number(race.meta?.distance);
      if (!dist || dist < 1400 || dist > 1600) continue;
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
      const qPay = (sHit || bHit) ? findPay(div, race.raceNo, top2, '連贏') : 0;
      let pqPay = 0;
      for (const p of pqH) pqPay += findPay(div, race.raceNo, p, '位置Q');

      const sP = (sHit ? qPay * STAKE / 10 : 0) - STAKE;
      const bP = (bHit ? qPay * STAKE / 10 : 0) - STAKE * banker.length;
      const pP = (pqPay * STAKE / 10) - STAKE * banker.length;

      dayRaces.push({
        raceNo: race.raceNo,
        dist,
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
}

console.log(`# V14 Base + Middle Distance (1400-1600m) 每日 / 月度詳情`);
console.log(`資料：${days.length} 個賽馬日 / ${days.reduce((s,d)=>s+d.n,0)} 場`);
console.log();

// ===== 每日表 =====
console.log('## 每日輸贏表');
console.log('| 日期 | 場 | 中(連) | 中(位Q) | 連贏單注 | 連贏膽拖 | 位Q膽拖 | 累計連贏單 | 累計連贏膽 | 累計位Q膽 |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
let cumS = 0, cumB = 0, cumP = 0;
const fmt = (v) => v >= 0 ? `+$${Math.round(v).toLocaleString()}` : `-$${Math.abs(Math.round(v)).toLocaleString()}`;
for (const d of days) {
  cumS += d.sPnl; cumB += d.bPnl; cumP += d.pPnl;
  console.log(`| ${d.date} | ${d.n} | ${d.bHits} | ${d.pqHits} | ${fmt(d.sPnl)} | ${fmt(d.bPnl)} | ${fmt(d.pPnl)} | ${fmt(cumS)} | ${fmt(cumB)} | ${fmt(cumP)} |`);
}

console.log();
console.log('## 月度合計');
console.log('| 月 | 賽日 | 場 | 中(連) | 中率 | 連贏單 | 連贏膽 | 位Q膽 |');
console.log('|---|---|---|---|---|---|---|---|');
const byMonth = {};
for (const d of days) {
  const ym = d.date.slice(0, 7);
  if (!byMonth[ym]) byMonth[ym] = [];
  byMonth[ym].push(d);
}
const monthRows = [];
for (const ym of Object.keys(byMonth).sort()) {
  const ds = byMonth[ym];
  const n = ds.reduce((s,x)=>s+x.n,0);
  const bH = ds.reduce((s,x)=>s+x.bHits,0);
  const sP = ds.reduce((s,x)=>s+x.sPnl,0);
  const bP = ds.reduce((s,x)=>s+x.bPnl,0);
  const pP = ds.reduce((s,x)=>s+x.pPnl,0);
  monthRows.push({ ym, days: ds.length, n, bH, sP, bP, pP, hr: n?bH/n*100:0 });
  console.log(`| ${ym} | ${ds.length} | ${n} | ${bH} | ${(bH/n*100).toFixed(1)}% | ${fmt(sP)} | ${fmt(bP)} | ${fmt(pP)} |`);
}

console.log();
console.log('## 月度 ROI 分佈');
const positiveB = monthRows.filter(m => m.bP > 0).length;
const negativeB = monthRows.filter(m => m.bP < 0).length;
const totalP = monthRows.reduce((s,m)=>s+m.bP,0);
console.log(`月份: ${monthRows.length} / 賺月 ${positiveB} / 蝕月 ${negativeB} / 月度勝率 ${(positiveB/monthRows.length*100).toFixed(1)}%`);
console.log(`連贏膽拖總盈虧: ${fmt(totalP)}`);

// ===== Top / Bottom days =====
console.log();
console.log('## Top 10 最佳日（連贏膽拖）');
console.log('| 日期 | 場 | 中(連) | 連贏膽拖 | 派彩 race |');
console.log('|---|---|---|---|---|');
const topDays = days.slice().sort((a,b) => b.bPnl - a.bPnl).slice(0, 10);
for (const d of topDays) {
  const wins = d.races.filter(r => r.bP > 0).map(r => `R${r.raceNo} ${r.pick}→${r.actualTop3} +$${Math.round(r.bP)}`).join(' / ');
  console.log(`| ${d.date} | ${d.n} | ${d.bHits} | ${fmt(d.bPnl)} | ${wins} |`);
}

console.log();
console.log('## Bottom 10 最差日（連贏膽拖）');
console.log('| 日期 | 場 | 中(連) | 連贏膽拖 | 揀邊隻 |');
console.log('|---|---|---|---|---|');
const botDays = days.slice().sort((a,b) => a.bPnl - b.bPnl).slice(0, 10);
for (const d of botDays) {
  const picks = d.races.map(r => `R${r.raceNo} ${r.pick}→${r.actualTop3}`).join(' / ');
  console.log(`| ${d.date} | ${d.n} | ${d.bHits} | ${fmt(d.bPnl)} | ${picks} |`);
}

// ===== Drawdown curve =====
console.log();
console.log('## 累積 PnL 同 Drawdown（每 10 個賽馬日 checkpoint，連贏膽拖）');
console.log('| 序號 | 日期 | 累計 PnL | 距離高位 |');
console.log('|---|---|---|---|');
let cum = 0, peak = 0, maxDD = 0, ddDate = '';
for (let i = 0; i < days.length; i++) {
  cum += days[i].bPnl;
  if (cum > peak) peak = cum;
  const dd = cum - peak;
  if (dd < maxDD) { maxDD = dd; ddDate = days[i].date; }
  if ((i + 1) % 10 === 0 || i === days.length - 1) {
    console.log(`| ${i + 1} | ${days[i].date} | ${fmt(cum)} | ${fmt(dd)} |`);
  }
}
console.log();
console.log(`📉 最大回撤: ${fmt(maxDD)}（喺 ${ddDate}）`);

// ===== Win/loss streak =====
console.log();
console.log('## 連續輸贏分析（賽馬日級別，連贏膽拖）');
let lossDays = 0, winDays = 0, maxLossDays = 0, maxWinDays = 0;
let curLossSpan = '', maxLossSpan = '';
let lossStart = null;
for (let i = 0; i < days.length; i++) {
  const d = days[i];
  if (d.bPnl < 0) {
    if (lossDays === 0) lossStart = d.date;
    lossDays++;
    winDays = 0;
    if (lossDays > maxLossDays) { maxLossDays = lossDays; maxLossSpan = `${lossStart} ~ ${d.date}`; }
  } else if (d.bPnl > 0) {
    winDays++;
    lossDays = 0;
    if (winDays > maxWinDays) maxWinDays = winDays;
  }
}
console.log(`最長連蝕: ${maxLossDays} 個賽馬日 (${maxLossSpan})`);
console.log(`最長連中: ${maxWinDays} 個賽馬日`);

// ===== Yearly =====
console.log();
console.log('## 年度');
console.log('| 年 | 賽日 | 場 | 中 | 中率 | 連贏單 ROI | 連贏膽 ROI | 位Q膽 ROI |');
console.log('|---|---|---|---|---|---|---|---|');
const byYear = {};
for (const d of days) {
  const y = d.date.slice(0, 4);
  if (!byYear[y]) byYear[y] = [];
  byYear[y].push(d);
}
for (const y of Object.keys(byYear).sort()) {
  const ds = byYear[y];
  const n = ds.reduce((s,x)=>s+x.n,0);
  const bH = ds.reduce((s,x)=>s+x.bHits,0);
  const sP = ds.reduce((s,x)=>s+x.sPnl,0);
  const bP = ds.reduce((s,x)=>s+x.bPnl,0);
  const pP = ds.reduce((s,x)=>s+x.pPnl,0);
  const sROI = (sP / (n * STAKE) * 100).toFixed(1);
  const bROI = (bP / (n * STAKE * 2) * 100).toFixed(1);  // approx (avg banker = 2)
  const pROI = (pP / (n * STAKE * 2) * 100).toFixed(1);
  console.log(`| ${y} | ${ds.length} | ${n} | ${bH} | ${(bH/n*100).toFixed(1)}% | ${sROI>=0?'+':''}${sROI}% | ${bROI>=0?'+':''}${bROI}% | ${pROI>=0?'+':''}${pROI}% |`);
}

fs.writeFileSync(path.join(ROOT, 'data/v14-middle-daily.json'), JSON.stringify(days, null, 2), 'utf8');
console.log();
console.log('Wrote data/v14-middle-daily.json');
