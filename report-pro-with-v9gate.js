// report-pro-with-v9gate.js
// 用 V9 gate 篩場(field>=10、coreDistance、topGap 0.25-4.25、reliability/suitability)
// 但揀馬用 Pro Top1+Top2(唔用 V9 Top1+Top2)
// 連贏 Top1+Top2 一注 $10

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
    .races.find((x) => x.raceNo === raceNo)?.dividends || {};
}

function qinPay(div, a, b) {
  const pool = div['連贏'] || [];
  const key = [a, b].map(Number).sort((x, y) => x - y).join(',');
  const m = pool.find((p) => p.combo.replace(/\s/g, '').split(',').map(Number).sort((x, y) => x - y).join(',') === key);
  return m ? m.amount : 0;
}

let total = { s: 0, r: 0, n: 0, hit: 0, agreedTop2: 0 };
const daily = [];

allDays.forEach((d) => {
  const proBt = JSON.parse(fs.readFileSync(paths.backtestPath('pro', d), 'utf8'));
  const v9Bt = JSON.parse(fs.readFileSync(paths.backtestPath('v9', d), 'utf8'));
  const v9ByRace = new Map(v9Bt.races.map((r) => [r.raceNo, r]));

  let dDay = { s: 0, r: 0, n: 0, hit: 0, agreedTop2: 0 };
  const races = [];

  proBt.races.forEach((race) => {
    const actual = race.actualTop3;
    if (!actual || actual.length === 0) return;
    const v9Race = v9ByRace.get(race.raceNo);
    if (!v9Race) return;

    // 用 V9 gate 篩場(攞返 V9 backtest 入面 recommendations.action === 'play')
    if (v9Race.recommendations?.action !== 'play') return;

    // 揀馬用 Pro Top1+Top2
    const [p1, p2] = race.proTop4;
    if (!p1 || !p2) return;

    const div = getDiv(d, race.raceNo);
    const [a1, a2] = actual;
    const won = (p1 === a1 && p2 === a2) || (p1 === a2 && p2 === a1);
    const pay = won ? qinPay(div, p1, p2) * (STAKE / 10) : 0;

    dDay.s += STAKE; dDay.n += 1;
    if (won) { dDay.r += pay; dDay.hit += 1; }

    // V9 自己揀 Top1+2 同 Pro Top1+2 係咪同(資訊用)
    const v9Bet = v9Race.recommendations?.bets?.[0]?.horses;
    if (v9Bet) {
      const [q1, q2] = v9Bet;
      const sameSet = new Set([p1, p2]).size === 2 &&
                       new Set([q1, q2, p1, p2]).size === 2;
      if (sameSet) dDay.agreedTop2 += 1;
    }

    races.push({ raceNo: race.raceNo, p1, p2, a: actual.join('-'), won, pay });
  });

  total.s += dDay.s; total.r += dDay.r;
  total.n += dDay.n; total.hit += dDay.hit;
  total.agreedTop2 += dDay.agreedTop2;
  daily.push({ day: d, ...dDay, races });
});

console.log('==========================================================');
console.log('Pro 揀馬 + V9 gate 篩場  連贏 Top1+Top2 $10/注');
console.log(`2026-01-01 至 ${allDays[allDays.length - 1]}`);
console.log('==========================================================\n');

const profit = total.r - total.s;
const roi = total.s ? ((profit / total.s) * 100).toFixed(2) : '-';
const hitRate = total.n ? ((total.hit / total.n) * 100).toFixed(1) : '-';
const agreeRate = total.n ? ((total.agreedTop2 / total.n) * 100).toFixed(1) : '-';
console.log(`下注場數:        ${total.n}`);
console.log(`命中:           ${total.hit} (${hitRate}%)`);
console.log(`Pro/V9 同揀 Top2: ${total.agreedTop2} (${agreeRate}%)`);
console.log(`投注:           $${total.s}`);
console.log(`派彩:           $${total.r.toFixed(0)}`);
console.log(`盈虧:           $${profit >= 0 ? '+' : ''}${profit.toFixed(0)}`);
console.log(`ROI:           ${roi}%`);

console.log('\n=== 每月 ===');
const months = {};
daily.forEach((d) => {
  const m = d.day.slice(0, 7);
  if (!months[m]) months[m] = { s: 0, r: 0, n: 0, hit: 0 };
  months[m].s += d.s;
  months[m].r += d.r;
  months[m].n += d.n;
  months[m].hit += d.hit;
});
console.log('月份     | 注/中    | 投   | 收     | 盈虧    | ROI');
console.log('-'.repeat(60));
Object.entries(months).sort().forEach(([k, m]) => {
  const p = m.r - m.s;
  const r = m.s ? ((p / m.s) * 100).toFixed(1) : '-';
  console.log(
    `${k}  | ${String(m.n).padStart(3)}/${String(m.hit).padStart(2)}   | $${String(m.s).padStart(4)} | $${m.r.toFixed(0).padStart(5)}  | $${(p >= 0 ? '+' : '') + p.toFixed(0).padStart(5)}  | ${String(r).padStart(7)}%`,
  );
});

console.log('\n=== 每日 ===');
console.log('日期       | 注/中  投    收     盈虧    ROI');
console.log('-'.repeat(55));
daily.forEach((d) => {
  if (d.n === 0) return;
  const p = d.r - d.s;
  const r = d.s ? ((p / d.s) * 100).toFixed(0) : '-';
  console.log(
    `${d.day} | ${String(d.n).padStart(2)}/${String(d.hit).padStart(2)}   $${String(d.s).padStart(3)}  $${d.r.toFixed(0).padStart(4)}  $${(p >= 0 ? '+' : '') + p.toFixed(0).padStart(4)}  ${String(r).padStart(4)}%`,
  );
});

const skipped = daily.filter((d) => d.n === 0).length;
if (skipped) {
  console.log(`\n(${skipped} 日全日 V9 gate 全部 skip,冇下注)`);
}
