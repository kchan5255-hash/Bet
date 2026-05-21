// report-pro-v9-qin.js
// Pro(無 gate)vs V9(有 gate)2026 年連贏 Top1+Top2 每日輸贏

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const PRO_DIR = path.join(__dirname, 'data', 'backtest', 'pro', '2026');
const STAKE = 10;

const allDays = fs.readdirSync(PRO_DIR)
  .filter((f) => /^backtest-2026-\d{2}-\d{2}\.json$/.test(f))
  .map((f) => f.match(/(\d{4}-\d{2}-\d{2})/)[1])
  .sort();

function getDiv(d, raceNo) {
  return JSON.parse(fs.readFileSync(paths.dividendsPath(d), 'utf8'))
    .races.find((x) => x.raceNo === raceNo)
    ?.dividends || {};
}

function qinPay(div, a, b) {
  const pool = div['連贏'] || [];
  const key = [a, b].map(Number).sort((x, y) => x - y).join(',');
  const m = pool.find((p) => p.combo.replace(/\s/g, '').split(',').map(Number).sort((x, y) => x - y).join(',') === key);
  return m ? m.amount : 0;
}

let proTotal = { s: 0, r: 0, n: 0, hit: 0 };
let v9Total = { s: 0, r: 0, n: 0, hit: 0 };
const daily = [];

allDays.forEach((d) => {
  const proBt = JSON.parse(fs.readFileSync(paths.backtestPath('pro', d), 'utf8'));
  const v9Bt = JSON.parse(fs.readFileSync(paths.backtestPath('v9', d), 'utf8'));
  const v9ByRace = new Map(v9Bt.races.map((r) => [r.raceNo, r]));

  let dPro = { s: 0, r: 0, n: 0, hit: 0 };
  let dV9 = { s: 0, r: 0, n: 0, hit: 0 };

  proBt.races.forEach((race) => {
    const actual = race.actualTop3;
    if (!actual || actual.length === 0) return;
    const div = getDiv(d, race.raceNo);
    const [a1, a2] = actual;

    const [p1, p2] = race.proTop4;
    if (p1 && p2) {
      dPro.s += STAKE;
      dPro.n += 1;
      const won = (p1 === a1 && p2 === a2) || (p1 === a2 && p2 === a1);
      if (won) {
        dPro.r += qinPay(div, p1, p2) * (STAKE / 10);
        dPro.hit += 1;
      }
    }

    const v9Race = v9ByRace.get(race.raceNo);
    const bet = v9Race?.recommendations?.bets?.[0];
    if (bet && bet.id === 'v9-qinella-top12') {
      const [q1, q2] = bet.horses;
      dV9.s += STAKE;
      dV9.n += 1;
      const won = (q1 === a1 && q2 === a2) || (q1 === a2 && q2 === a1);
      if (won) {
        dV9.r += qinPay(div, q1, q2) * (STAKE / 10);
        dV9.hit += 1;
      }
    }
  });

  proTotal.s += dPro.s; proTotal.r += dPro.r; proTotal.n += dPro.n; proTotal.hit += dPro.hit;
  v9Total.s += dV9.s; v9Total.r += dV9.r; v9Total.n += dV9.n; v9Total.hit += dV9.hit;
  daily.push({ day: d, pro: dPro, v9: dV9 });
});

console.log('==========================================================');
console.log('Pro(無 gate,每場下注) vs V9(gate,選場下注)');
console.log(`連贏 Top1+Top2 一注 $${STAKE},2026-01-01 至 ${allDays[allDays.length - 1]}`);
console.log('==========================================================\n');

function fmt(label, x) {
  const profit = x.r - x.s;
  const roi = x.s ? ((profit / x.s) * 100).toFixed(2) : '-';
  const hitRate = x.n ? ((x.hit / x.n) * 100).toFixed(1) : '-';
  console.log(
    `${label} | 注 ${String(x.n).padStart(4)} 場 | 命中 ${String(x.hit).padStart(3)} (${String(hitRate).padStart(5)}%) | ` +
    `投 $${String(x.s).padStart(5)} | 收 $${x.r.toFixed(0).padStart(6)} | 盈 $${(profit >= 0 ? '+' : '') + profit.toFixed(0).padStart(6)} | ROI ${String(roi).padStart(8)}%`,
  );
}
fmt('Pro 全場', proTotal);
fmt('V9 gate ', v9Total);

console.log('\n=== 每月 ===');
const months = {};
daily.forEach((d) => {
  const m = d.day.slice(0, 7);
  if (!months[m]) months[m] = { pro: { s: 0, r: 0, n: 0, hit: 0 }, v9: { s: 0, r: 0, n: 0, hit: 0 } };
  ['pro', 'v9'].forEach((k) => {
    months[m][k].s += d[k].s;
    months[m][k].r += d[k].r;
    months[m][k].n += d[k].n;
    months[m][k].hit += d[k].hit;
  });
});
console.log('月份     | Pro 注/中 | Pro ROI    | V9 注/中 | V9 ROI');
console.log('-'.repeat(68));
Object.entries(months).sort().forEach(([k, m]) => {
  const proRoi = m.pro.s ? ((m.pro.r - m.pro.s) / m.pro.s * 100).toFixed(1) : '-';
  const v9Roi = m.v9.s ? ((m.v9.r - m.v9.s) / m.v9.s * 100).toFixed(1) : '-';
  console.log(
    `${k}  | ${String(m.pro.n).padStart(3)}/${String(m.pro.hit).padStart(3)}   | ${String(proRoi).padStart(8)}%  | ` +
    `${String(m.v9.n).padStart(3)}/${String(m.v9.hit).padStart(3)}   | ${String(v9Roi).padStart(8)}%`,
  );
});

console.log('\n=== 每日 ===');
console.log('日期       | Pro 注/中  Pro 投   收      盈      ROI    | V9 注/中  V9 投   收      盈      ROI');
console.log('-'.repeat(110));
daily.forEach((d) => {
  const pp = d.pro.r - d.pro.s;
  const vp = d.v9.r - d.v9.s;
  const proRoi = d.pro.s ? ((pp / d.pro.s) * 100).toFixed(0) : '-';
  const v9Roi = d.v9.s ? ((vp / d.v9.s) * 100).toFixed(0) : '-';
  console.log(
    `${d.day} | ${String(d.pro.n).padStart(2)}/${String(d.pro.hit).padStart(2)}   $${String(d.pro.s).padStart(4)}  $${d.pro.r.toFixed(0).padStart(5)}  $${(pp >= 0 ? '+' : '') + pp.toFixed(0).padStart(5)}  ${String(proRoi).padStart(4)}%  | ` +
    `${String(d.v9.n).padStart(2)}/${String(d.v9.hit).padStart(2)}   $${String(d.v9.s).padStart(4)}  $${d.v9.r.toFixed(0).padStart(5)}  $${(vp >= 0 ? '+' : '') + vp.toFixed(0).padStart(5)}  ${String(v9Roi).padStart(4)}%`,
  );
});
