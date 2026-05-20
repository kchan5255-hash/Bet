// pnl-engine.js
// 根據 backtest 輸出(每場模型 Top4)同派彩表,計算各投注策略嘅 ROI
// 用法: node pnl-engine.js

const fs = require('fs');
const paths = require('./paths');

const days = [
  { date: '2026-05-13', venue: 'HV', backtest: null, liveTop4: null, races: 9 },
  { date: '2026-05-09', venue: 'ST' },
  { date: '2026-05-03', venue: 'ST' },
  { date: '2026-04-29', venue: 'HV' },
  { date: '2026-04-26', venue: 'ST' },
  { date: '2026-04-22', venue: 'HV' },
  { date: '2026-04-19', venue: 'ST' },
  { date: '2026-04-15', venue: 'HV' },
  { date: '2026-04-12', venue: 'ST' },
  { date: '2026-04-08', venue: 'HV' },
];

// 5-13 live 模型 Top4（上線版 Original + Professional）— 之前已計
const liveFive13 = [
  { raceNo:1, origTop4:['1','5','9','7'], proTop4:['1','5','11','9'], actualTop3:['1','3','12'] },
  { raceNo:2, origTop4:['12','3','4','8'], proTop4:['12','3','8','2'], actualTop3:['12','8','4'] },
  { raceNo:3, origTop4:['1','4','8','7'], proTop4:['1','8','4','7'], actualTop3:['7','1','4'] },
  { raceNo:4, origTop4:['3','1','2','10'], proTop4:['3','1','2','10'], actualTop3:['4','10','11'] },
  { raceNo:5, origTop4:['1','6','8','3'], proTop4:['1','6','8','3'], actualTop3:['1','6','8'] },
  { raceNo:6, origTop4:['10','6','3','12'], proTop4:['6','12','10','9'], actualTop3:['7','6','10'] },
  { raceNo:7, origTop4:['6','7','10','9'], proTop4:['6','10','12','9'], actualTop3:['11','3','1'] },
  { raceNo:8, origTop4:['2','6','10','11'], proTop4:['2','11','1','6'], actualTop3:['11','1','2'] },
  { raceNo:9, origTop4:['8','4','2','5'], proTop4:['2','8','5','4'], actualTop3:['9','4','10'] },
];

function loadDay(day) {
  if (day.date === '2026-05-13') {
    return liveFive13.map(r => ({
      raceNo: r.raceNo,
      origTop4: r.origTop4,
      proTop4: r.proTop4,
      v3Top4: r.origTop4, // 5-13 冇 V3,fallback 用 orig
      actualTop3: r.actualTop3,
    }));
  }
  // 優先讀 V3 版 backtest
  const v3File = paths.backtestPath('v3', day.date);
  if (fs.existsSync(v3File)) {
    const b = JSON.parse(fs.readFileSync(v3File, 'utf8'));
    return b.races.map(r => ({
      raceNo: r.raceNo,
      origTop4: r.origTop4,
      proTop4: r.proTop4,
      v3Top4: r.v3Top4,
      actualTop3: r.actualTop3,
    }));
  }
  const proFile = day.backtest || paths.backtestPath('pro', day.date);
  const b = JSON.parse(fs.readFileSync(proFile, 'utf8'));
  return b.races.map(r => ({
    raceNo: r.raceNo,
    origTop4: r.origTop4,
    proTop4: r.proTop4,
    v3Top4: r.origTop4,
    actualTop3: r.actualTop3,
  }));
}

function loadDividends(date) {
  const file = paths.dividendsPath(date);
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const byRace = {};
  d.races.forEach(r => { byRace[r.raceNo] = r.dividends || {}; });
  return byRace;
}

// 派彩查詢: 馬號(或馬號組合) -> return per $10
function winPay(div, no) {
  const pool = div['獨贏'] || [];
  const match = pool.find(p => p.combo === no || p.combo === no.toString());
  return match ? match.amount : 0;
}
function placePay(div, no) {
  const pool = div['位置'] || [];
  const match = pool.find(p => p.combo === no || p.combo === no.toString());
  return match ? match.amount : 0;
}
function qinPay(div, noA, noB) {
  const pool = div['連贏'] || [];
  const sorted = [noA, noB].map(Number).sort((a, b) => a - b).join(',');
  const match = pool.find(p => {
    const combo = p.combo.replace(/\s/g, '');
    const parts = combo.split(',').map(Number).sort((a, b) => a - b).join(',');
    return parts === sorted;
  });
  return match ? match.amount : 0;
}
function qplPay(div, noA, noB) {
  const pool = div['位置Q'] || [];
  const sorted = [noA, noB].map(Number).sort((a, b) => a - b).join(',');
  const match = pool.find(p => {
    const combo = p.combo.replace(/\s/g, '');
    const parts = combo.split(',').map(Number).sort((a, b) => a - b).join(',');
    return parts === sorted;
  });
  return match ? match.amount : 0;
}

// 投注策略定義 — 每個 return { stake, returnAmount }
// stake 係總投注額,returnAmount 係收回嘅錢(包本),profit = returnAmount - stake
function strategy_win_top1(top4, actual, div) {
  const top1 = top4[0];
  const stake = 10;
  const ret = top1 === actual[0] ? winPay(div, top1) : 0;
  return { stake, ret };
}
function strategy_place_top1(top4, actual, div) {
  const top1 = top4[0];
  const stake = 10;
  const ret = actual.includes(top1) ? placePay(div, top1) : 0;
  return { stake, ret };
}
function strategy_place_top3(top4, actual, div) {
  // 買 Top1/Top2/Top3 位置,各 $10 = $30 總注
  const picks = top4.slice(0, 3);
  let ret = 0;
  picks.forEach(p => { if (actual.includes(p)) ret += placePay(div, p); });
  return { stake: 30, ret };
}
function strategy_qin_top1_top2(top4, actual, div) {
  // 連贏 Top1-Top2 單注 $10
  const [a, b] = top4;
  const stake = 10;
  const hit = (actual[0] === a && actual[1] === b) || (actual[0] === b && actual[1] === a);
  const ret = hit ? qinPay(div, a, b) : 0;
  return { stake, ret };
}
function strategy_qin_wheel_top1(top4, actual, div) {
  // 連贏 Top1 對 Top2-3-4,三組 $30 總注
  const top1 = top4[0];
  const others = top4.slice(1, 4);
  let ret = 0;
  others.forEach(o => {
    const hit = (actual[0] === top1 && actual[1] === o) || (actual[0] === o && actual[1] === top1);
    if (hit) ret += qinPay(div, top1, o);
  });
  return { stake: 30, ret };
}
function strategy_qin_top4_combos(top4, actual, div) {
  // 連贏 Top1-2-3-4 全組合 C(4,2)=6,$60 總注
  let pairs = [];
  for (let i = 0; i < top4.length; i++)
    for (let j = i + 1; j < top4.length; j++)
      pairs.push([top4[i], top4[j]]);
  let ret = 0;
  pairs.forEach(([x, y]) => {
    const hit = (actual[0] === x && actual[1] === y) || (actual[0] === y && actual[1] === x);
    if (hit) ret += qinPay(div, x, y);
  });
  return { stake: 60, ret };
}
function strategy_qpl_top3_combos(top4, actual, div) {
  // 位置Q Top1-2-3 全組合(C(3,2)=3),$30 總注
  const [a, b, c] = top4;
  const pairs = [[a,b],[a,c],[b,c]];
  let ret = 0;
  pairs.forEach(([x, y]) => {
    if (actual.includes(x) && actual.includes(y)) {
      ret += qplPay(div, x, y);
    }
  });
  return { stake: 30, ret };
}
function strategy_qpl_top4_combos(top4, actual, div) {
  // 位置Q Top1-2-3-4 全組合(C(4,2)=6),$60 總注
  let pairs = [];
  for (let i = 0; i < top4.length; i++)
    for (let j = i + 1; j < top4.length; j++)
      pairs.push([top4[i], top4[j]]);
  let ret = 0;
  pairs.forEach(([x, y]) => {
    if (actual.includes(x) && actual.includes(y)) {
      ret += qplPay(div, x, y);
    }
  });
  return { stake: 60, ret };
}

const strategies = [
  { name: '獨贏 Top1($10)', fn: strategy_win_top1 },
  { name: '位置 Top1($10)', fn: strategy_place_top1 },
  { name: '位置 Top1-3($30)', fn: strategy_place_top3 },
  { name: '連贏 Top1&2($10)', fn: strategy_qin_top1_top2 },
  { name: '連贏 Top1輪 2-4($30)', fn: strategy_qin_wheel_top1 },
  { name: '連贏 Top1-4全組合($60)', fn: strategy_qin_top4_combos },
  { name: '位置Q Top1-3組合($30)', fn: strategy_qpl_top3_combos },
  { name: '位置Q Top1-4全組合($60)', fn: strategy_qpl_top4_combos },
];

// ===== 主流程 =====
const agg = {};  // { modelName -> { stratName -> { stake, ret, races } } }
function initAgg(model, strat) {
  if (!agg[model]) agg[model] = {};
  if (!agg[model][strat]) agg[model][strat] = { stake: 0, ret: 0, races: 0, wins: 0 };
}

const daily = []; // per-day breakdown
days.forEach(day => {
  const races = loadDay(day);
  const divs = loadDividends(day.date);
  const dayAgg = { date: day.date, venue: day.venue, results: {} };

  ['Original', 'Professional', 'V3'].forEach(modelName => {
    strategies.forEach(s => {
      initAgg(modelName, s.name);
      dayAgg.results[modelName + '|' + s.name] = { stake: 0, ret: 0, races: 0, wins: 0 };
    });
  });

  races.forEach(race => {
    const div = divs[race.raceNo] || {};
    ['Original', 'Professional', 'V3'].forEach(modelName => {
      const top4 = modelName === 'Original' ? race.origTop4 :
                   modelName === 'Professional' ? race.proTop4 :
                   race.v3Top4;
      strategies.forEach(s => {
        const { stake, ret } = s.fn(top4, race.actualTop3, div);
        agg[modelName][s.name].stake += stake;
        agg[modelName][s.name].ret += ret;
        agg[modelName][s.name].races += 1;
        if (ret > stake) agg[modelName][s.name].wins += 1;

        const k = modelName + '|' + s.name;
        dayAgg.results[k].stake += stake;
        dayAgg.results[k].ret += ret;
        dayAgg.results[k].races += 1;
        if (ret > stake) dayAgg.results[k].wins += 1;
      });
    });
  });
  daily.push(dayAgg);
});

// ===== 輸出 =====
console.log('=== 每日 P&L (只顯示關鍵策略) ===');
const keyStrats = ['獨贏 Top1($10)', '位置 Top1-3($30)', '連贏 Top1輪 2-4($30)', '位置Q Top1-3組合($30)', '位置Q Top1-4全組合($60)'];
daily.forEach(day => {
  console.log('\n--- ' + day.date + ' ' + day.venue + ' ---');
  console.log('模型       | 策略                        | 注額   | 回收   | 盈虧   | ROI    | 贏場');
  ['Original', 'Professional', 'V3'].forEach(m => {
    keyStrats.forEach(s => {
      const r = day.results[m + '|' + s];
      const profit = r.ret - r.stake;
      const roi = r.stake ? (profit / r.stake * 100).toFixed(1) : '0';
      console.log(
        m.padEnd(11) + '| ' + s.padEnd(28) + '| $' +
        String(r.stake).padStart(5) + ' | $' +
        r.ret.toFixed(0).padStart(5) + ' | $' +
        profit.toFixed(0).padStart(5) + ' | ' +
        roi.padStart(6) + '% | ' +
        r.wins + '/' + r.races
      );
    });
  });
});

console.log('\n\n=== ' + days.length + ' 日合計 P&L (' + Object.values(agg.Original)[0].races + ' 場) ===');
console.log('模型       | 策略                        | 總注額   | 總回收   | 淨盈虧   | ROI      | 贏場');
console.log('-'.repeat(110));
['Original', 'Professional', 'V3'].forEach(m => {
  strategies.forEach(s => {
    const r = agg[m][s.name];
    const profit = r.ret - r.stake;
    const roi = r.stake ? (profit / r.stake * 100).toFixed(2) : '0';
    console.log(
      m.padEnd(11) + '| ' + s.name.padEnd(28) + '| $' +
      String(r.stake).padStart(6) + ' | $' +
      r.ret.toFixed(0).padStart(6) + ' | $' +
      profit.toFixed(0).padStart(7) + ' | ' +
      roi.padStart(7) + '% | ' +
      r.wins + '/' + r.races
    );
  });
  console.log('-'.repeat(110));
});

fs.writeFileSync('pnl-report.json', JSON.stringify({ daily, agg }, null, 2), 'utf8');
console.log('\n寫入 pnl-report.json');
