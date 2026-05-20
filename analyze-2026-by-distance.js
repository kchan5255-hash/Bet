// analyze-2026-by-distance.js
// 2026 年 V14 picks 喺 1200 / 1400 / 1600 各自嘅每日 / 月度 / 完整分析

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
  for (const d of list) if (d.combo.split(',').sort().join(',') === k) return d.amount;
  return 0;
}

const fmt = (v) => v >= 0 ? `+$${Math.round(v).toLocaleString()}` : `-$${Math.abs(Math.round(v)).toLocaleString()}`;

function analyzeDist(targetDist) {
  const dir = path.join(ROOT, 'data/backtest/v14/2026');
  const days = [];

  for (const f of fs.readdirSync(dir).sort()) {
    const m = f.match(/(\d{4}-\d{2}-\d{2})/);
    if (!m) continue;
    const date = m[1];
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const div = loadDiv(date);

    const dayRaces = [];
    for (const race of data.races) {
      if (!race.recommend?.bets?.length || !race.actualTop3 || race.actualTop3.length < 3) continue;
      const dist = Number(race.meta?.distance);
      if (dist !== targetDist) continue;
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
        raceNo: race.raceNo, dist,
        cls: race.meta?.className || '',
        venue: data.venue || '',
        pick: race.recommend.qinT12.label,
        actualTop3: race.actualTop3.join('-'),
        sHit, bHit, pqHit: pqH.length > 0,
        sP, bP, pP, bn: banker.length,
      });
    }
    if (dayRaces.length) {
      days.push({
        date, venue: data.venue || '',
        n: dayRaces.length, races: dayRaces,
        sPnl: dayRaces.reduce((s,r)=>s+r.sP, 0),
        bPnl: dayRaces.reduce((s,r)=>s+r.bP, 0),
        pPnl: dayRaces.reduce((s,r)=>s+r.pP, 0),
        sHits: dayRaces.filter(r=>r.sHit).length,
        bHits: dayRaces.filter(r=>r.bHit).length,
        pqHits: dayRaces.filter(r=>r.pqHit).length,
      });
    }
  }
  return days;
}

function printSection(targetDist) {
  const days = analyzeDist(targetDist);
  const totalRaces = days.reduce((s,d)=>s+d.n, 0);
  const totalSPnl = days.reduce((s,d)=>s+d.sPnl, 0);
  const totalBPnl = days.reduce((s,d)=>s+d.bPnl, 0);
  const totalPPnl = days.reduce((s,d)=>s+d.pPnl, 0);
  const sH = days.reduce((s,d)=>s+d.sHits, 0);
  const bH = days.reduce((s,d)=>s+d.bHits, 0);
  const pH = days.reduce((s,d)=>s+d.pqHits, 0);

  console.log(`\n# ===== ${targetDist}m =====`);
  console.log(`資料：${days.length} 個賽馬日 / ${totalRaces} 場`);
  console.log();

  // 月度
  console.log('## 月度');
  console.log('| 月 | 賽日 | 場 | 連贏中 | 中率 | 連贏單注 | 連贏膽拖 | 位Q膽拖 |');
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
    const bH2 = ds.reduce((s,x)=>s+x.bHits,0);
    const sP = ds.reduce((s,x)=>s+x.sPnl,0);
    const bP = ds.reduce((s,x)=>s+x.bPnl,0);
    const pP = ds.reduce((s,x)=>s+x.pPnl,0);
    console.log(`| ${ym} | ${ds.length} | ${n} | ${bH2} | ${(bH2/n*100).toFixed(1)}% | ${fmt(sP)} | ${fmt(bP)} | ${fmt(pP)} |`);
  }

  // 每日
  console.log();
  console.log('## 每日');
  console.log('| 日期 | 場地 | 場 | 中(連) | 中(位Q) | 連贏單注 | 連贏膽拖 | 位Q膽拖 | 累計連贏單 | 累計連贏膽 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  let cumS = 0, cumB = 0;
  for (const d of days) {
    cumS += d.sPnl; cumB += d.bPnl;
    console.log(`| ${d.date} | ${d.venue} | ${d.n} | ${d.bHits} | ${d.pqHits} | ${fmt(d.sPnl)} | ${fmt(d.bPnl)} | ${fmt(d.pPnl)} | ${fmt(cumS)} | ${fmt(cumB)} |`);
  }

  // 班次分拆
  console.log();
  console.log('## 班次分拆');
  console.log('| 班次 | 場 | 中 | 中率 | 連贏單注 ROI | 連贏膽拖 ROI |');
  console.log('|---|---|---|---|---|---|');
  const byCls = {};
  for (const d of days) for (const r of d.races) {
    const cls = r.cls;
    if (!byCls[cls]) byCls[cls] = [];
    byCls[cls].push(r);
  }
  for (const cls of Object.keys(byCls).sort()) {
    const rs = byCls[cls];
    const bH3 = rs.filter(r=>r.bHit).length;
    const sP = rs.reduce((s,x)=>s+x.sP,0);
    const bP = rs.reduce((s,x)=>s+x.bP,0);
    const sROI = sP / (rs.length * STAKE) * 100;
    const bROI = bP / rs.reduce((s,x)=>s+x.bn*STAKE,0) * 100;
    console.log(`| ${cls} | ${rs.length} | ${bH3} | ${(bH3/rs.length*100).toFixed(1)}% | ${fmt(sP)} (${sROI>=0?'+':''}${sROI.toFixed(1)}%) | ${fmt(bP)} (${bROI>=0?'+':''}${bROI.toFixed(1)}%) |`);
  }

  // 場地分拆
  console.log();
  console.log('## 場地分拆 (HV vs ST)');
  console.log('| 場地 | 場 | 中 | 中率 | 連贏單注 ROI | 連贏膽拖 ROI |');
  console.log('|---|---|---|---|---|---|');
  const byVenue = {};
  for (const d of days) for (const r of d.races) {
    if (!byVenue[r.venue]) byVenue[r.venue] = [];
    byVenue[r.venue].push(r);
  }
  for (const v of Object.keys(byVenue)) {
    const rs = byVenue[v];
    const bH4 = rs.filter(r=>r.bHit).length;
    const sP = rs.reduce((s,x)=>s+x.sP,0);
    const bP = rs.reduce((s,x)=>s+x.bP,0);
    const sROI = sP / (rs.length * STAKE) * 100;
    const bROI = bP / rs.reduce((s,x)=>s+x.bn*STAKE,0) * 100;
    console.log(`| ${v} | ${rs.length} | ${bH4} | ${(bH4/rs.length*100).toFixed(1)}% | ${fmt(sP)} (${sROI>=0?'+':''}${sROI.toFixed(1)}%) | ${fmt(bP)} (${bROI>=0?'+':''}${bROI.toFixed(1)}%) |`);
  }

  // 中咗的場詳情
  console.log();
  console.log('## 中連贏嘅場（詳情）');
  console.log('| 日期 | Race | 班 | 推介 | 實際 Top3 | 派彩 |');
  console.log('|---|---|---|---|---|---|');
  for (const d of days) {
    for (const r of d.races) {
      if (r.bHit) {
        // back-derive payout
        const pay = (r.bP + r.bn * STAKE) * 10 / STAKE;
        console.log(`| ${d.date} | R${r.raceNo} | ${r.cls} | ${r.pick} | ${r.actualTop3} | $${pay.toFixed(0)} |`);
      }
    }
  }

  // 總計
  console.log();
  console.log('## 總計');
  console.log(`場數: ${totalRaces}`);
  console.log(`連贏單注：中 ${sH}/${totalRaces} (${(sH/totalRaces*100).toFixed(1)}%) / 流轉 $${(totalRaces*STAKE).toLocaleString()} / ${fmt(totalSPnl)} / ROI ${(totalSPnl/(totalRaces*STAKE)*100).toFixed(1)}%`);
  const stakeB = days.reduce((s,d)=>s+d.races.reduce((ss,r)=>ss+r.bn*STAKE,0),0);
  console.log(`連贏膽拖：中 ${bH}/${totalRaces} (${(bH/totalRaces*100).toFixed(1)}%) / 流轉 $${stakeB.toLocaleString()} / ${fmt(totalBPnl)} / ROI ${(totalBPnl/stakeB*100).toFixed(1)}%`);
  console.log(`位Q膽拖：中 ${pH}/${totalRaces} (${(pH/totalRaces*100).toFixed(1)}%) / ${fmt(totalPPnl)} / ROI ${(totalPPnl/stakeB*100).toFixed(1)}%`);

  // 連蝕分析
  let lossDays = 0, maxLossDays = 0, lossSpan = '';
  let lossStart = null;
  for (const d of days) {
    if (d.bPnl < 0) {
      if (lossDays === 0) lossStart = d.date;
      lossDays++;
      if (lossDays > maxLossDays) { maxLossDays = lossDays; lossSpan = `${lossStart} ~ ${d.date}`; }
    } else if (d.bPnl > 0) {
      lossDays = 0;
    }
  }
  console.log(`最長連蝕（連贏膽拖）：${maxLossDays} 個賽馬日（${lossSpan}）`);

  return { totalRaces, sPnl: totalSPnl, bPnl: totalBPnl, pPnl: totalPPnl, sH, bH, pH };
}

const r1200 = printSection(1200);
const r1400 = printSection(1400);
const r1600 = printSection(1600);

console.log('\n# ===== 三距離對比總表 =====');
console.log('| 距離 | 場 | 中(連) | 中率 | 連贏單注 ROI | 連贏膽拖 ROI | 位Q膽拖 ROI |');
console.log('|---|---|---|---|---|---|---|');
for (const [dist, r] of [[1200, r1200], [1400, r1400], [1600, r1600]]) {
  const sROI = r.sPnl / (r.totalRaces * STAKE) * 100;
  const bROI = r.bPnl / (r.totalRaces * STAKE * 2) * 100;
  const pROI = r.pPnl / (r.totalRaces * STAKE * 2) * 100;
  console.log(`| ${dist}m | ${r.totalRaces} | ${r.bH} | ${(r.bH/r.totalRaces*100).toFixed(1)}% | ${fmt(r.sPnl)} (${sROI>=0?'+':''}${sROI.toFixed(1)}%) | ${fmt(r.bPnl)} (${bROI>=0?'+':''}${bROI.toFixed(1)}%) | ${fmt(r.pPnl)} (${pROI>=0?'+':''}${pROI.toFixed(1)}%) |`);
}
