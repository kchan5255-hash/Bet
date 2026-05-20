// compare-claude-v12.js
// 對比 V12 vs Claude (Opus 4.6, Level A) 喺 2026 年 5 月嘅連贏單注表現
//
// 玩法：每場 t1+t2 連贏 $100，actual 冠亞軍要 == {t1, t2}（次序唔重要）先中
// HKJC 連贏派彩係 $10 注本，所以 $100 注派彩 = combo amount × 10

const fs = require('fs');

const DATES = ['2026-05-03', '2026-05-06', '2026-05-09', '2026-05-13', '2026-05-17'];
const STAKE = 100;

function loadDividends(date) {
  const p = `d:/AI/Bet/data/dividends/2026/dividends-${date}.json`;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function loadV12(date) {
  const p = `d:/AI/Bet/data/backtest/v12/2026/backtest-v12-${date}.json`;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function loadClaude(date) {
  const p = `d:/AI/Bet/data/claude-picks/claude-picks-${date}.json`;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function loadClaudeC(date) {
  const p = `d:/AI/Bet/data/claude-picks-c/claude-picks-c-${date}.json`;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// 連贏中：t1+t2 sorted = actual 冠亞軍 sorted
function quinellaPayout(divRace, t1, t2) {
  if (!t1 || !t2) return null;
  const target = [t1, t2].map(String).sort().join(',');
  const list = divRace?.dividends?.['連贏'] || [];
  for (const d of list) {
    const sorted = d.combo.split(',').map((s) => s.trim()).sort().join(',');
    if (sorted === target) return d.amount * 10; // $10 → $100 注
  }
  return 0;
}

function evalSet(label, picks, divIndex) {
  let races = 0, hits = 0, payout = 0;
  const detail = [];
  for (const { date, raceNo, t1, t2 } of picks) {
    races++;
    const divRace = divIndex[`${date}|${raceNo}`];
    const p = quinellaPayout(divRace, t1, t2);
    if (p > 0) hits++;
    payout += p;
    detail.push({ date, raceNo, t1, t2, payout: p });
  }
  const stake = races * STAKE;
  const pnl = payout - stake;
  const roi = stake > 0 ? (pnl / stake) * 100 : 0;
  return { label, races, hits, hitRate: races ? (hits / races) * 100 : 0, stake, payout, pnl, roi, detail };
}

function fmt(n, dp = 0) {
  return Number(n).toFixed(dp).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function main() {
  // build dividend index
  const divIndex = {};
  for (const d of DATES) {
    const dd = loadDividends(d);
    for (const r of dd.races) {
      divIndex[`${d}|${r.raceNo}`] = r;
    }
  }

  // V12 picks
  const v12Picks = [];
  for (const d of DATES) {
    const data = loadV12(d);
    for (const r of data.races) {
      if (r.recommend && r.recommend.tier === 'strong') {
        const [t1, t2] = r.recommend.qinT12.combo.split(',');
        v12Picks.push({ date: d, raceNo: r.raceNo, t1, t2 });
      }
    }
  }

  // Claude picks (Level A)
  const claudePicksAll = [];
  const claudePicksHi = [];
  for (const d of DATES) {
    const data = loadClaude(d);
    for (const p of data.picks) {
      if (p.pick.action === 'play' && p.pick.t1 && p.pick.t2) {
        claudePicksAll.push({ date: d, raceNo: p.raceNo, t1: p.pick.t1, t2: p.pick.t2, conf: p.pick.confidence });
        if (p.pick.confidence >= 65) {
          claudePicksHi.push({ date: d, raceNo: p.raceNo, t1: p.pick.t1, t2: p.pick.t2, conf: p.pick.confidence });
        }
      }
    }
  }

  // Claude Level C picks（數據 + AI）
  const claudeCAll = [];
  const claudeCHi = [];
  for (const d of DATES) {
    const data = loadClaudeC(d);
    for (const p of data.picks) {
      if (p.pick.action === 'play' && p.pick.t1 && p.pick.t2) {
        claudeCAll.push({ date: d, raceNo: p.raceNo, t1: p.pick.t1, t2: p.pick.t2, conf: p.pick.confidence });
        if (p.pick.confidence >= 70) {
          claudeCHi.push({ date: d, raceNo: p.raceNo, t1: p.pick.t1, t2: p.pick.t2, conf: p.pick.confidence });
        }
      }
    }
  }

  const totalRaces = Object.keys(divIndex).length;

  const v12Result = evalSet('V12 Strong', v12Picks, divIndex);
  const claudeAll = evalSet('Claude A all', claudePicksAll, divIndex);
  const claudeHi = evalSet('Claude A conf≥65', claudePicksHi, divIndex);
  const claudeCAllR = evalSet('Claude C all', claudeCAll, divIndex);
  const claudeCHiR = evalSet('Claude C conf≥70', claudeCHi, divIndex);

  console.log(`\n========== 5月對比：連贏單注 $100/場 ==========`);
  console.log(`5 月共 ${totalRaces} 場（${DATES.join(', ')}）\n`);

  const rows = [v12Result, claudeAll, claudeHi, claudeCAllR, claudeCHiR];
  console.log(`策略             | 揀場 | 中 | 中率   | 流轉    | 派彩    | 盈虧     | ROI`);
  console.log(`-----------------|------|----|--------|---------|---------|----------|--------`);
  for (const r of rows) {
    console.log(
      `${r.label.padEnd(16)} | ${String(r.races).padStart(4)} | ${String(r.hits).padStart(2)} | ${r.hitRate.toFixed(1).padStart(5)}% | $${fmt(r.stake).padStart(6)} | $${fmt(r.payout).padStart(6)} | ${(r.pnl >= 0 ? '+' : '') + '$' + fmt(r.pnl)} | ${(r.roi >= 0 ? '+' : '') + r.roi.toFixed(1)}%`
    );
  }

  // overlap：V12 揀嘅 4 場 Claude A / C 點揀
  console.log(`\n========== Overlap（V12 揀嘅 ${v12Picks.length} 場）==========`);
  for (const v of v12Picks) {
    const key = `${v.date}|${v.raceNo}`;
    const aMatch = claudePicksAll.find((c) => c.date === v.date && c.raceNo === v.raceNo);
    const cMatch = claudeCAll.find((c) => c.date === v.date && c.raceNo === v.raceNo);
    const divRace = divIndex[key];
    const v12Pay = quinellaPayout(divRace, v.t1, v.t2);
    const aPay = aMatch ? quinellaPayout(divRace, aMatch.t1, aMatch.t2) : null;
    const cPay = cMatch ? quinellaPayout(divRace, cMatch.t1, cMatch.t2) : null;
    const winner = (divRace?.dividends?.['獨贏']?.[0]?.combo) || '?';
    const place2 = (divRace?.dividends?.['位置']?.[1]?.combo) || '?';
    console.log(
      `  ${v.date} R${v.raceNo} 冠亞=${winner},${place2} | V12 ${v.t1}+${v.t2} → ${v12Pay > 0 ? '$' + v12Pay + ' ✓' : 'miss'} | A: ${aMatch ? `${aMatch.t1}+${aMatch.t2}(${aMatch.conf}) ${aPay > 0 ? '✓' : '✗'}` : 'SKIP'} | C: ${cMatch ? `${cMatch.t1}+${cMatch.t2}(${cMatch.conf}) ${cPay > 0 ? '✓' : '✗'}` : 'SKIP'}`
    );
  }

  // Claude C 中嘅場
  const cHits = claudeCAllR.detail.filter((d) => d.payout > 0);
  console.log(`\n========== Claude Level C 中嘅 ${cHits.length} 場 ==========`);
  for (const h of cHits) {
    console.log(`  ${h.date} R${h.raceNo} ${h.t1}+${h.t2} → $${h.payout}`);
  }

  // 寫埋一份 JSON
  fs.writeFileSync('d:/AI/Bet/claude-vs-v12-may-report.json', JSON.stringify({
    totalRaces,
    v12: v12Result,
    claudeA: claudeAll,
    claudeAhi: claudeHi,
    claudeC: claudeCAllR,
    claudeChi: claudeCHiR,
  }, null, 2));
  console.log(`\n→ d:\\AI\\Bet\\claude-vs-v12-may-report.json`);
}

main();
