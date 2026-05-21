// analyze-v17-2026-daily.js
// 2026 每日 V17 V17-A 全部嘅 4 玩法輸贏

const fs = require('fs');
const path = require('path');

const ROOT = 'd:/AI/Bet';
const STAKE = 100;

function loadDividends(date) {
  const fp = path.join(ROOT, `data/dividends/${date.slice(0,4)}/dividends-${date}.json`);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function findPayout(divData, raceNo, pair, type) {
  if (!divData) return 0;
  const race = divData.races?.find(r => r.raceNo === raceNo);
  if (!race) return 0;
  const list = race.dividends?.[type] || [];
  const sortedKey = pair.slice().sort((a, b) => Number(a) - Number(b)).join(',');
  for (const d of list) {
    const k = d.combo.split(',').map(s => s.trim()).sort((a, b) => Number(a) - Number(b)).join(',');
    if (k === sortedKey) return d.amount;
  }
  return 0;
}

function evalRace(rec, race, divData) {
  const top3 = race.actualTop3.slice(0, 3);
  if (top3.length < 3) return null;
  const top2 = top3.slice(0, 2);
  const t12 = rec.qinT12.combo.split(',');
  const banker = rec.qinBanker.map(b => b.combo.split(','));
  const inTop2 = (no) => top2.includes(no);
  const inTop3 = (no) => top3.includes(no);
  const pair2 = (p) => inTop2(p[0]) && inTop2(p[1]);
  const pair3 = (p) => inTop3(p[0]) && inTop3(p[1]);

  const qinSingleHit = pair2(t12);
  const qinBankerHits = banker.filter(pair2);
  const qinPay = (qinSingleHit || qinBankerHits.length) ? findPayout(divData, race.raceNo, top2, '連贏') : 0;

  const pqSingleHit = pair3(t12);
  const pqBankerHits = banker.filter(pair3);
  const pqSinglePay = pqSingleHit ? findPayout(divData, race.raceNo, t12, '位置Q') : 0;
  let pqBankerPay = 0;
  for (const p of pqBankerHits) pqBankerPay += findPayout(divData, race.raceNo, p, '位置Q');

  return {
    qinSinglePnl: (qinSingleHit ? qinPay * STAKE / 10 : 0) - STAKE,
    qinBankerPnl: (qinBankerHits.length ? qinPay * STAKE / 10 : 0) - STAKE * 2,
    pqSinglePnl: (pqSinglePay * STAKE / 10) - STAKE,
    pqBankerPnl: (pqBankerPay * STAKE / 10) - STAKE * 2,
    qinHit: qinBankerHits.length > 0,
    pqHit: pqBankerHits.length > 0,
  };
}

const dir = path.join(ROOT, 'data/backtest/v17/2026');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();

const days = [];
for (const f of files) {
  const m = f.match(/(\d{4}-\d{2}-\d{2})/);
  if (!m) continue;
  const date = m[1];
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const div = loadDividends(date);

  const races = [];
  for (const race of data.races) {
    if (!race.recommend || !race.actualTop3 || race.actualTop3.length < 3) continue;
    const tier = race.recommendations?.tier;
    if (!tier) continue;
    const e = evalRace(race.recommend, race, div);
    if (!e) continue;
    races.push({
      raceNo: race.raceNo,
      tier,
      pick: race.recommend.qinT12.label,
      actualTop3: race.actualTop3.join('-'),
      ...e,
    });
  }

  if (!races.length) continue;
  days.push({
    date,
    venue: data.venue,
    n: races.length,
    nB: races.filter(r => r.tier === 'B').length,
    nC: races.filter(r => r.tier === 'C').length,
    qinSingle: races.reduce((s, r) => s + r.qinSinglePnl, 0),
    qinBanker: races.reduce((s, r) => s + r.qinBankerPnl, 0),
    pqSingle: races.reduce((s, r) => s + r.pqSinglePnl, 0),
    pqBanker: races.reduce((s, r) => s + r.pqBankerPnl, 0),
    qinHits: races.filter(r => r.qinHit).length,
    pqHits: races.filter(r => r.pqHit).length,
    races,
  });
}

// ===== Output =====
console.log('===== V17-A 全部：2026 每日輸贏 =====');
console.log(`${days.length} 個賽馬日 / 連贏單注 $${STAKE}·場 / 連贏膽拖 $${STAKE * 2}·場 / 位置Q單注 $${STAKE} / 位置Q膽拖 $${STAKE * 2}`);
console.log();

console.log('## 每日表（連贏 + 位置Q）');
console.log('| 日期 | 場/中(連贏)/中(位Q) | 連贏單注 | 連贏膽拖 | 位置Q單 | 位置Q膽拖 | 累計連贏單 | 累計連贏膽 | 累計位Q單 | 累計位Q膽 |');
console.log('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|');

let cumQS = 0, cumQB = 0, cumPS = 0, cumPB = 0;
for (const d of days) {
  cumQS += d.qinSingle;
  cumQB += d.qinBanker;
  cumPS += d.pqSingle;
  cumPB += d.pqBanker;
  const fmt = (v) => v >= 0 ? `+$${Math.round(v).toLocaleString()}` : `-$${Math.abs(Math.round(v)).toLocaleString()}`;
  const tierMix = `${d.n}(B${d.nB}/C${d.nC})`;
  console.log(`| ${d.date} | ${tierMix}/${d.qinHits}連/${d.pqHits}位 | ${fmt(d.qinSingle)} | ${fmt(d.qinBanker)} | ${fmt(d.pqSingle)} | ${fmt(d.pqBanker)} | ${fmt(cumQS)} | ${fmt(cumQB)} | ${fmt(cumPS)} | ${fmt(cumPB)} |`);
}

// 統計
const tot = (arr, k) => arr.reduce((s, x) => s + x[k], 0);
console.log();
console.log('## 月度合計');
console.log('| 月 | 賽日 | 場 | 連贏單 | 連贏膽 | 位Q單 | 位Q膽 |');
console.log('|---|---:|---:|---:|---:|---:|---:|');
const byMonth = {};
for (const d of days) {
  const ym = d.date.slice(0, 7);
  if (!byMonth[ym]) byMonth[ym] = [];
  byMonth[ym].push(d);
}
for (const ym of Object.keys(byMonth).sort()) {
  const md = byMonth[ym];
  const fmt = (v) => v >= 0 ? `+$${Math.round(v).toLocaleString()}` : `-$${Math.abs(Math.round(v)).toLocaleString()}`;
  console.log(`| ${ym} | ${md.length} | ${tot(md, 'n')} | ${fmt(tot(md, 'qinSingle'))} | ${fmt(tot(md, 'qinBanker'))} | ${fmt(tot(md, 'pqSingle'))} | ${fmt(tot(md, 'pqBanker'))} |`);
}

console.log();
console.log('## 全年總計');
const all = {
  qinSingle: tot(days, 'qinSingle'),
  qinBanker: tot(days, 'qinBanker'),
  pqSingle: tot(days, 'pqSingle'),
  pqBanker: tot(days, 'pqBanker'),
};
const totalRaces = tot(days, 'n');
console.log(`| 玩法 | 場 | 流轉 | 盈虧 | ROI |`);
console.log(`|---|---:|---:|---:|---:|`);
console.log(`| 連贏單注 | ${totalRaces} | $${(totalRaces * STAKE).toLocaleString()} | ${all.qinSingle >= 0 ? '+' : ''}$${Math.round(all.qinSingle).toLocaleString()} | ${all.qinSingle >= 0 ? '+' : ''}${(all.qinSingle / (totalRaces * STAKE) * 100).toFixed(1)}% |`);
console.log(`| 連贏膽拖 | ${totalRaces} | $${(totalRaces * STAKE * 2).toLocaleString()} | ${all.qinBanker >= 0 ? '+' : ''}$${Math.round(all.qinBanker).toLocaleString()} | ${all.qinBanker >= 0 ? '+' : ''}${(all.qinBanker / (totalRaces * STAKE * 2) * 100).toFixed(1)}% |`);
console.log(`| 位置Q單注 | ${totalRaces} | $${(totalRaces * STAKE).toLocaleString()} | ${all.pqSingle >= 0 ? '+' : ''}$${Math.round(all.pqSingle).toLocaleString()} | ${all.pqSingle >= 0 ? '+' : ''}${(all.pqSingle / (totalRaces * STAKE) * 100).toFixed(1)}% |`);
console.log(`| 位置Q膽拖 | ${totalRaces} | $${(totalRaces * STAKE * 2).toLocaleString()} | ${all.pqBanker >= 0 ? '+' : ''}$${Math.round(all.pqBanker).toLocaleString()} | ${all.pqBanker >= 0 ? '+' : ''}${(all.pqBanker / (totalRaces * STAKE * 2) * 100).toFixed(1)}% |`);

// Top / Bottom days
console.log();
console.log('## Top 5 最佳日（連贏單注）');
console.log('| 日期 | 場 | 中 | 連贏單注 | 中咗嘅 race |');
console.log('|---|---:|---:|---:|---|');
const sortedTop = days.slice().sort((a, b) => b.qinSingle - a.qinSingle).slice(0, 5);
for (const d of sortedTop) {
  const wins = d.races.filter(r => r.qinSinglePnl > 0).map(r => `R${r.raceNo} ${r.pick}→${r.actualTop3} +$${Math.round(r.qinSinglePnl)}`).join(' / ');
  console.log(`| ${d.date} | ${d.n} | ${d.qinHits} | +$${Math.round(d.qinSingle).toLocaleString()} | ${wins} |`);
}

console.log();
console.log('## Bottom 5 最差日（連贏單注）');
console.log('| 日期 | 場 | 中 | 連贏單注 | 揀邊隻 |');
console.log('|---|---:|---:|---:|---|');
const sortedBot = days.slice().sort((a, b) => a.qinSingle - b.qinSingle).slice(0, 5);
for (const d of sortedBot) {
  const picks = d.races.map(r => `R${r.raceNo} ${r.pick}→${r.actualTop3}`).join(' / ');
  console.log(`| ${d.date} | ${d.n} | ${d.qinHits} | -$${Math.abs(Math.round(d.qinSingle)).toLocaleString()} | ${picks} |`);
}

// 同日全部蝕嘅日子
console.log();
console.log('## 全部 4 玩法都蝕嘅日子');
const allLose = days.filter(d => d.qinSingle < 0 && d.qinBanker < 0 && d.pqSingle < 0 && d.pqBanker < 0);
console.log(`共 ${allLose.length} 日 / ${days.length}`);
for (const d of allLose) {
  console.log(`  ${d.date}: ${d.n} 場 全部唔中`);
}

console.log();
console.log('## 全部 4 玩法都贏嘅日子');
const allWin = days.filter(d => d.qinSingle > 0 && d.qinBanker > 0 && d.pqSingle > 0 && d.pqBanker > 0);
console.log(`共 ${allWin.length} 日 / ${days.length}`);
for (const d of allWin) {
  console.log(`  ${d.date}: 連贏單 +$${Math.round(d.qinSingle)} / 位Q膽 +$${Math.round(d.pqBanker)}`);
}

fs.writeFileSync(path.join(ROOT, 'data/v17-2026-daily.json'), JSON.stringify(days, null, 2), 'utf8');
console.log();
console.log('Wrote data/v17-2026-daily.json');
