const fs = require('fs');
const paths = require('./paths');
const allDays = [
  '2026-05-13','2026-05-09','2026-05-03','2026-04-29','2026-04-26','2026-04-22','2026-04-19','2026-04-15','2026-04-12','2026-04-08',
  '2026-03-22','2026-03-18','2026-03-15','2026-03-11','2026-03-08','2026-03-04','2026-03-01',
  '2026-02-25','2026-02-22','2026-02-11','2026-02-08','2026-02-04','2026-02-01',
  '2026-01-28','2026-01-25','2026-01-18','2026-01-14','2026-01-11','2026-01-07','2026-01-04','2026-01-01',
];

function getDiv(d, n) { return JSON.parse(fs.readFileSync(paths.dividendsPath(d),'utf8')).races.find(x=>x.raceNo===n).dividends; }
function qinPay(div, a, b) { const pool = div['連贏']||[]; const key = [a,b].map(Number).sort((x,y)=>x-y).join(','); const m = pool.find(p => p.combo.replace(/\s/g,'').split(',').map(Number).sort((x,y)=>x-y).join(',') === key); return m?m.amount:0; }
function placePay(div, n) { const p = (div['位置']||[]).find(x=>x.combo===n); return p?p.amount:0; }
function qplPay(div, a, b) { const pool = div['位置Q']||[]; const key = [a,b].map(Number).sort((x,y)=>x-y).join(','); const m = pool.find(p => p.combo.replace(/\s/g,'').split(',').map(Number).sort((x,y)=>x-y).join(',') === key); return m?m.amount:0; }

function v5Filter(race) {
  const dist = race.meta?.distance;
  const cls = race.meta?.className;
  const ranking = race.proRanking;
  if (!ranking || ranking.length < 2) return {play:false};
  const gap = ranking[0].prob - ranking[1].prob;
  const fs2 = ranking.length;
  if (fs2 <= 9) return {play:false};
  if ([1000,1600,2000,2200].includes(dist)) return {play:false};
  if (!dist) return {play:false};
  if (cls === '新馬賽') return {play:false};
  if (gap >= 3) return {play:false};
  if (gap < 0.5) return {play:false};
  return {play:true};
}

let pro = {s:0,r:0}, v5 = {s:0,r:0,n:0};
let totalRaces = 0;
let hitPro=0, champPro=0;
const daily = [];

allDays.forEach(d => {
  const b = JSON.parse(fs.readFileSync(paths.backtestPath('pro', d),'utf8'));
  let dPro={s:0,r:0}, d5={s:0,r:0,n:0};
  b.races.forEach(race => {
    if (!race.actualTop3 || race.actualTop3.length === 0) return;
    totalRaces++;
    const div = getDiv(d, race.raceNo);
    const a = race.actualTop3;
    const [pP1,pP2,pP3,pP4] = race.proTop4;

    if (race.proTop4.some(n => a.includes(n))) hitPro++;
    if (race.proTop4.includes(a[0])) champPro++;

    const winP = (div['獨贏']||[]).find(x=>x.combo===pP1);
    dPro.s += 240;
    if (pP1===a[0]) dPro.r += winP?winP.amount:0;
    if (a.includes(pP1)) dPro.r += placePay(div, pP1);
    [pP1,pP2,pP3].forEach(x => { if (x && a.includes(x)) dPro.r += placePay(div, x); });
    if ((pP1===a[0]&&pP2===a[1])||(pP1===a[1]&&pP2===a[0])) dPro.r += qinPay(div, pP1, pP2);
    [pP2,pP3,pP4].forEach(o => { if (o && ((pP1===a[0]&&o===a[1])||(pP1===a[1]&&o===a[0]))) dPro.r += qinPay(div, pP1, o); });
    for (let i=0;i<4;i++) for (let j=i+1;j<4;j++) {
      const x = race.proTop4[i], y = race.proTop4[j];
      if (x && y && ((x===a[0]&&y===a[1])||(x===a[1]&&y===a[0]))) dPro.r += qinPay(div, x, y);
    }
    [[pP1,pP2],[pP1,pP3],[pP2,pP3]].forEach(([x,y]) => { if (x && y && a.includes(x)&&a.includes(y)) dPro.r += qplPay(div, x, y); });
    for (let i=0;i<4;i++) for (let j=i+1;j<4;j++) {
      const x = race.proTop4[i], y = race.proTop4[j];
      if (x && y && a.includes(x)&&a.includes(y)) dPro.r += qplPay(div, x, y);
    }

    if (v5Filter(race).play) {
      d5.n++; d5.s += 50;
      if ((pP1===a[0]&&pP2===a[1])||(pP1===a[1]&&pP2===a[0])) d5.r += qinPay(div, pP1, pP2);
      [pP2,pP3,pP4].forEach(o => { if (o && ((pP1===a[0]&&o===a[1])||(pP1===a[1]&&o===a[0]))) d5.r += qinPay(div, pP1, o); });
      if (a.includes(pP1)) d5.r += placePay(div, pP1);
    }
  });
  pro.s += dPro.s; pro.r += dPro.r;
  v5.s += d5.s; v5.r += d5.r; v5.n += d5.n;
  daily.push({day:d, n:b.races.length, pro:{...dPro}, v5:{...d5}});
});

console.log('=========================================');
console.log('31 日 Pro 對齊新 features-pro 後 ROI ('+allDays.length+' 日 / '+totalRaces+' 場)');
console.log('=========================================\n');

console.log('命中率:');
console.log('  Pro Top4命中三: '+hitPro+'/'+totalRaces+' ('+(hitPro/totalRaces*100).toFixed(1)+'%) | 命中冠: '+champPro+'/'+totalRaces+' ('+(champPro/totalRaces*100).toFixed(1)+'%)');

console.log('\n=== 總盈虧 (31 日) ===');
const fmt = (lbl,x) => { const p = x.r-x.s; const roi=x.s?(p/x.s*100).toFixed(2):'0'; console.log(lbl+' | 下注場 '+(x.n||totalRaces).toString().padStart(4)+' | 注 $'+x.s.toString().padStart(6)+' | 收 $'+x.r.toFixed(0).padStart(7)+' | 盈 $'+(p>=0?'+':'')+p.toFixed(0).padStart(7)+' | ROI '+roi.padStart(8)+'%'); };
fmt('Pro 全場($240/場)     ', pro);
fmt('V5 Filter(Pro排序 $50)', v5);

console.log('\n=== 每月 ROI ===');
const months = {};
daily.forEach(d => {
  const m = d.day.slice(0,7);
  if (!months[m]) months[m] = {n:0,p:{s:0,r:0},v5:{s:0,r:0,n:0}};
  months[m].n += d.n;
  months[m].p.s += d.pro.s; months[m].p.r += d.pro.r;
  months[m].v5.s += d.v5.s; months[m].v5.r += d.v5.r; months[m].v5.n += d.v5.n;
});
console.log('月份     場數  | Pro ROI       | V5 ROI (場)');
console.log('-'.repeat(60));
Object.entries(months).sort().forEach(([k,m]) => {
  const roiP = m.p.s?((m.p.r-m.p.s)/m.p.s*100).toFixed(1):'-';
  const roiV5 = m.v5.s?((m.v5.r-m.v5.s)/m.v5.s*100).toFixed(1):'-';
  console.log(k+'  '+String(m.n).padStart(3)+' 場 | '+roiP.padStart(9)+'%  | '+roiV5.padStart(9)+'% ('+String(m.v5.n).padStart(3)+')');
});

console.log('\n=== 每日 ROI ===');
daily.forEach(d => {
  const roiP = d.pro.s?((d.pro.r-d.pro.s)/d.pro.s*100).toFixed(0):'-';
  const roiV5 = d.v5.s?((d.v5.r-d.v5.s)/d.v5.s*100).toFixed(0):'-';
  console.log(d.day+' | Pro '+roiP.padStart(4)+'% | V5 '+roiV5.padStart(5)+'% ('+String(d.v5.n).padStart(2)+'場)');
});
