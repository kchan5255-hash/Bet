// analyze-2025-2026-by-distance.js
// V14 picks 1200/1400/1600 — 2025 + 2026 兩年合併分析

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

function collect(years, targetDist) {
  const days = [];
  for (const yr of years) {
    const dir = path.join(ROOT, 'data/backtest/v14/' + yr);
    if (!fs.existsSync(dir)) continue;
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
        if (targetDist === 'all' ? !([1200, 1400, 1600].includes(dist)) : dist !== targetDist) continue;

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
  }
  return days;
}

function tally(days) {
  const totalRaces = days.reduce((s,d)=>s+d.n,0);
  const sP = days.reduce((s,d)=>s+d.sPnl,0);
  const bP = days.reduce((s,d)=>s+d.bPnl,0);
  const pP = days.reduce((s,d)=>s+d.pPnl,0);
  const sH = days.reduce((s,d)=>s+d.sHits,0);
  const bH = days.reduce((s,d)=>s+d.bHits,0);
  const pH = days.reduce((s,d)=>s+d.pqHits,0);
  const stakeS = totalRaces * STAKE;
  const stakeB = days.reduce((s,d)=>s+d.races.reduce((ss,r)=>ss+r.bn*STAKE,0),0);
  return { days: days.length, totalRaces, sP, bP, pP, sH, bH, pH, stakeS, stakeB,
    sROI: stakeS?(sP/stakeS*100):0, bROI: stakeB?(bP/stakeB*100):0, pROI: stakeB?(pP/stakeB*100):0,
    sHR: totalRaces?(sH/totalRaces*100):0, bHR: totalRaces?(bH/totalRaces*100):0, pHR: totalRaces?(pH/totalRaces*100):0 };
}

function maxDD(days, key) {
  let cum = 0, peak = 0, mdd = 0, ddDate = '';
  let lossStreak = 0, winStreak = 0, maxLoss = 0, maxWin = 0;
  let lossStart = '', maxLossSpan = '';
  for (const d of days) {
    cum += d[key];
    if (cum > peak) peak = cum;
    if (cum - peak < mdd) { mdd = cum - peak; ddDate = d.date; }
    if (d[key] < 0) {
      if (lossStreak === 0) lossStart = d.date;
      lossStreak++;
      winStreak = 0;
      if (lossStreak > maxLoss) { maxLoss = lossStreak; maxLossSpan = `${lossStart} ~ ${d.date}`; }
    } else if (d[key] > 0) {
      winStreak++;
      lossStreak = 0;
      if (winStreak > maxWin) maxWin = winStreak;
    }
  }
  return { mdd, ddDate, maxLoss, maxWin, maxLossSpan };
}

function monthBreak(days) {
  const out = {};
  for (const d of days) {
    const ym = d.date.slice(0,7);
    if (!out[ym]) out[ym] = [];
    out[ym].push(d);
  }
  return out;
}

function printDistance(targetDist, label) {
  const days = collect(['2025','2026'], targetDist);
  const t = tally(days);
  console.log(`\n# ===== ${label} =====`);
  console.log(`資料：${t.days} 個賽馬日 / ${t.totalRaces} 場（2025 + 2026）`);
  console.log();

  // 年度
  const y2025 = collect(['2025'], targetDist);
  const y2026 = collect(['2026'], targetDist);
  const t25 = tally(y2025);
  const t26 = tally(y2026);
  console.log('## 年度');
  console.log('| 年 | 賽日 | 場 | 中率(連) | 連贏單注 | 連贏膽拖 | 位Q膽拖 |');
  console.log('|---|---|---|---|---|---|---|');
  console.log(`| 2025 | ${t25.days} | ${t25.totalRaces} | ${t25.bHR.toFixed(1)}% | ${fmt(t25.sP)} (${t25.sROI>=0?'+':''}${t25.sROI.toFixed(1)}%) | ${fmt(t25.bP)} (${t25.bROI>=0?'+':''}${t25.bROI.toFixed(1)}%) | ${fmt(t25.pP)} (${t25.pROI>=0?'+':''}${t25.pROI.toFixed(1)}%) |`);
  console.log(`| 2026 | ${t26.days} | ${t26.totalRaces} | ${t26.bHR.toFixed(1)}% | ${fmt(t26.sP)} (${t26.sROI>=0?'+':''}${t26.sROI.toFixed(1)}%) | ${fmt(t26.bP)} (${t26.bROI>=0?'+':''}${t26.bROI.toFixed(1)}%) | ${fmt(t26.pP)} (${t26.pROI>=0?'+':''}${t26.pROI.toFixed(1)}%) |`);
  console.log(`| **2025-26 合計** | ${t.days} | ${t.totalRaces} | ${t.bHR.toFixed(1)}% | ${fmt(t.sP)} (${t.sROI>=0?'+':''}${t.sROI.toFixed(1)}%) | ${fmt(t.bP)} (${t.bROI>=0?'+':''}${t.bROI.toFixed(1)}%) | ${fmt(t.pP)} (${t.pROI>=0?'+':''}${t.pROI.toFixed(1)}%) |`);

  // 月度
  console.log();
  console.log('## 月度合計');
  console.log('| 月 | 場 | 中率 | 連贏單注 | 連贏膽拖 | 位Q膽拖 |');
  console.log('|---|---|---|---|---|---|');
  const byMon = monthBreak(days);
  for (const ym of Object.keys(byMon).sort()) {
    const ds = byMon[ym];
    const tt = tally(ds);
    console.log(`| ${ym} | ${tt.totalRaces} | ${tt.bHR.toFixed(1)}% | ${fmt(tt.sP)} (${tt.sROI>=0?'+':''}${tt.sROI.toFixed(1)}%) | ${fmt(tt.bP)} (${tt.bROI>=0?'+':''}${tt.bROI.toFixed(1)}%) | ${fmt(tt.pP)} (${tt.pROI>=0?'+':''}${tt.pROI.toFixed(1)}%) |`);
  }

  // 場地分拆
  console.log();
  console.log('## 場地分拆');
  console.log('| 場地 | 場 | 中(連) | 中率 | 單注 ROI | 膽拖 ROI |');
  console.log('|---|---|---|---|---|---|');
  const byVenue = {};
  for (const d of days) for (const r of d.races) {
    if (!byVenue[r.venue]) byVenue[r.venue] = [];
    byVenue[r.venue].push(r);
  }
  for (const v of Object.keys(byVenue).sort()) {
    const rs = byVenue[v];
    const sH = rs.filter(r=>r.sHit).length;
    const bH = rs.filter(r=>r.bHit).length;
    const sP = rs.reduce((s,x)=>s+x.sP,0);
    const bP = rs.reduce((s,x)=>s+x.bP,0);
    const stakeS = rs.length*STAKE;
    const stakeB = rs.reduce((s,x)=>s+x.bn*STAKE,0);
    console.log(`| ${v} | ${rs.length} | ${bH} | ${(bH/rs.length*100).toFixed(1)}% | ${fmt(sP)} (${(sP/stakeS*100).toFixed(1)}%) | ${fmt(bP)} (${(bP/stakeB*100).toFixed(1)}%) |`);
  }

  // 班次分拆
  console.log();
  console.log('## 班次分拆');
  console.log('| 班次 | 場 | 中(連) | 中率 | 單注 ROI | 膽拖 ROI |');
  console.log('|---|---|---|---|---|---|');
  const byCls = {};
  for (const d of days) for (const r of d.races) {
    if (!byCls[r.cls]) byCls[r.cls] = [];
    byCls[r.cls].push(r);
  }
  for (const cls of Object.keys(byCls).sort()) {
    const rs = byCls[cls];
    const bH = rs.filter(r=>r.bHit).length;
    const sP = rs.reduce((s,x)=>s+x.sP,0);
    const bP = rs.reduce((s,x)=>s+x.bP,0);
    const stakeB = rs.reduce((s,x)=>s+x.bn*STAKE,0);
    console.log(`| ${cls} | ${rs.length} | ${bH} | ${(bH/rs.length*100).toFixed(1)}% | ${fmt(sP)} (${(sP/(rs.length*STAKE)*100).toFixed(1)}%) | ${fmt(bP)} (${(bP/stakeB*100).toFixed(1)}%) |`);
  }

  // 風險
  console.log();
  const ddS = maxDD(days, 'sPnl');
  const ddB = maxDD(days, 'bPnl');
  console.log('## 風險指標');
  console.log(`連贏單注 — 最大回撤: ${fmt(ddS.mdd)} / 最長連蝕日: ${ddS.maxLoss} 日 (${ddS.maxLossSpan})`);
  console.log(`連贏膽拖 — 最大回撤: ${fmt(ddB.mdd)} / 最長連蝕日: ${ddB.maxLoss} 日 (${ddB.maxLossSpan})`);

  // Sensitivity
  const allRaces = [];
  for (const d of days) for (const r of d.races) allRaces.push(r);
  console.log();
  console.log('## Sensitivity（剔走 Top-N 派彩 race）連贏膽拖');
  console.log('| 剔 N | 場 | ROI |');
  console.log('|---|---|---|');
  const sortedRaces = allRaces.slice().sort((a,b) => b.bP - a.bP);
  for (const N of [0, 1, 3, 5, 10]) {
    const subset = sortedRaces.slice(N);
    const stake = subset.reduce((s,r)=>s+r.bn*STAKE,0);
    const pnl = subset.reduce((s,r)=>s+r.bP,0);
    const roi = stake?(pnl/stake*100):0;
    console.log(`| ${N} | ${subset.length} | ${fmt(pnl)} (${roi>=0?'+':''}${roi.toFixed(1)}%) |`);
  }
}

printDistance(1200, '1200m');
printDistance(1400, '1400m');
printDistance(1600, '1600m');
printDistance('all', '1200/1400/1600 合併');
