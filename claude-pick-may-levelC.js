// claude-pick-may-levelC.js
// Level C 對比實驗：Claude Opus 4.6 揀馬，feed V12 嘅 derived features + raw records
// Input：race meta + signals + V9 top5 numerical features + 各馬最近 6 場 records
// Output：每場 t1, t2, action, confidence, reason
//
// 用法：node claude-pick-may-levelC.js [date1 date2 ...]

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-opus-4-6';
const DATES = ['2026-05-03', '2026-05-06', '2026-05-09', '2026-05-13', '2026-05-17'];
const CONCURRENCY = 3;
const OUT_DIR = 'd:/AI/Bet/data/claude-picks-c';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const SYSTEM_PROMPT = `你係香港賽馬連贏分析員。每場 race 收到：
- 賽事 meta + race-level signals（topGap、top2Reliability、top1Shape 等）
- Pro 模型嘅 Top 5 馬，每匹有：預測勝率 prob、穩定度 reliability、出賽 records、5 大 group scores
- 各馬最近 6 場成績

任務：揀「連贏單注」嘅 T1+T2（兩匹同時跑入頭兩 — 次序唔重要），或者 skip。

連贏中獎 break-even 中率 ~16%（HKJC 抽水 17.5%）。
要 +ve EV，揀嘅組合中獎率要顯著高於市場 implied。

Hard constraint：
- T1 同 T2 必須喺 Pro Top 5 內揀（唔可以揀 Top 5 以外嘅馬）
- 冇明顯 edge 一定要 skip — 唔好每場都 play
- 信心 < 65 → skip

點樣讀數據：
- prob：Pro 模型預測獨贏率（%）。Top 1 通常 10-25%。
- reliability：T1 嘅穩定度（0-1），>0.5 算可信。
- records：該馬累計出賽，>10 數據可信。
- groups.suitability：呢場條件嘅 fit（距離、跑道、場地、檔位），>0.6 好。
- groups.formCycle：近期狀態。groups.provenAbility：往績實力。
- topGap：T1 prob - T2 prob。<5 = 主流好接近、>10 = T1 鶴立雞群。
- top1Shape：T1 嘅 race-shape 信號（0-1），>0.65 = 跑法 setup 有利。

只用提供嘅數字 + records 推理，唔可以幻想未提供嘅嘢。

只輸出 JSON（無 markdown fence）：
{"action":"play"|"skip","t1":"<馬號>","t2":"<馬號>","confidence":<0-100>,"reason":"<40字內>"}`;

function parseRecordDate(s) {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  y = y.length === 2 ? '20' + y : y;
  return new Date(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`);
}

function fmtNum(n, dp = 2) {
  if (n == null || Number.isNaN(n)) return '-';
  return Number(n).toFixed(dp);
}

function buildRacePrompt(race, v9Race, horseMap, raceDateStr) {
  const meta = race.meta || {};
  const cutoff = new Date(raceDateStr);
  const sig = v9Race?.signals || {};
  const lines = [
    `# 第 ${race.raceNo} 場`,
    `班次：${meta.className || '?'} | 距離：${meta.distance || '?'}m | 場地：${meta.going || '?'} | 跑道：${meta.course || '?'} | 出賽：${sig.fieldSize || race.runners.length}匹`,
    '',
    '## Race Signals',
    `topGap=${fmtNum(sig.topGap, 2)} | top2Reliability=${fmtNum(sig.top2Reliability, 3)} | top1Shape=${fmtNum(sig.top1Shape, 3)} | top1Prob=${fmtNum(sig.top1Prob, 1)}%`,
    '',
    '## Pro Top 5 馬（必須喺呢 5 匹入面揀）',
  ];
  const v9Top = (v9Race?.v9Ranking || []).slice(0, 5);
  for (const v9 of v9Top) {
    const runner = race.runners.find((r) => String(r.no) === String(v9.no));
    const h = horseMap[v9.code];
    const records = (h?.records || [])
      .filter((rec) => {
        const d = parseRecordDate(rec.date);
        return d && d < cutoff;
      })
      .slice(0, 6);
    lines.push(`\n### ${v9.no}. ${v9.name}（${v9.displayJockey || v9.jockey} / ${v9.displayTrainer || v9.trainer}）`);
    lines.push(`prob=${fmtNum(v9.prob, 1)}% | reliability=${fmtNum(v9.reliability, 3)} | records=${v9.records || 0} | 檔=${v9.draw} | 評分=${v9.rating}`);
    if (v9.groups) {
      lines.push(`groups: formCycle=${fmtNum(v9.groups.formCycle, 2)} | provenAbility=${fmtNum(v9.groups.provenAbility, 2)} | suitability=${fmtNum(v9.groups.suitability, 2)} | raceShape=${fmtNum(v9.groups.raceShape, 2)}`);
    }
    if (v9.topFactors?.length) {
      lines.push(`top factors: ${v9.topFactors.map((f) => `${f.factor}(${fmtNum(f.impact, 2)})`).join(', ')}`);
    }
    if (records.length) {
      lines.push('近6場：');
      for (const rec of records) {
        lines.push(`  ${rec.date} ${rec.track || ''} ${rec.distance}m ${rec.going} cl${rec.classNo} 檔${rec.draw} → 名次 ${rec.place} (LBW ${rec.lbw} odds ${rec.odds})`);
      }
    }
  }
  return lines.join('\n');
}

async function pickRace(race, v9Race, horseMap, raceDateStr, ctx) {
  const userText = buildRacePrompt(race, v9Race, horseMap, raceDateStr);
  const t0 = Date.now();
  let resp;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      resp = await client.messages.create({
        model: MODEL,
        max_tokens: 400,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userText }],
      });
      break;
    } catch (e) {
      if (attempt === 2) throw e;
      const wait = 2000 * (attempt + 1);
      console.warn(`  [retry ${attempt + 1}] ${ctx} → ${e.message}, wait ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  const dt = Date.now() - t0;
  const text = resp.content.map((c) => c.text || '').join('').trim();
  let parsed;
  try {
    const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    parsed = JSON.parse(cleaned);
  } catch (e) {
    parsed = { action: 'skip', t1: null, t2: null, confidence: 0, reason: 'parse_error', raw: text };
  }
  return { raceNo: race.raceNo, pick: parsed, usage: resp.usage, durationMs: dt };
}

async function processDate(date) {
  const resultsPath = `d:/AI/Bet/data/results/2026/results-full-${date}.json`;
  const v9Path = `d:/AI/Bet/data/backtest/v9/2026/backtest-v9-${date}.json`;
  const dailyHorsesPath = `d:/AI/Bet/data/horses/horses-${date}.json`;
  const allHorsesPath = `d:/AI/Bet/data/horses/horses-all.json`;
  if (!fs.existsSync(resultsPath) || !fs.existsSync(v9Path)) {
    console.warn(`SKIP ${date}: missing data`);
    return null;
  }
  const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const v9Data = JSON.parse(fs.readFileSync(v9Path, 'utf8'));
  const v9Map = Object.fromEntries(v9Data.races.map((r) => [r.raceNo, r]));
  const horseMap = {};
  if (fs.existsSync(dailyHorsesPath)) {
    const daily = JSON.parse(fs.readFileSync(dailyHorsesPath, 'utf8')).horses;
    for (const h of daily) horseMap[h.code] = h;
  }
  if (fs.existsSync(allHorsesPath)) {
    const all = JSON.parse(fs.readFileSync(allHorsesPath, 'utf8')).horses;
    for (const h of all) {
      if (!horseMap[h.code]) horseMap[h.code] = h;
    }
  }
  console.log(`\n=== ${date} (${data.races.length} races) ===`);
  const races = data.races;
  const picks = new Array(races.length);
  let idx = 0;
  async function worker() {
    while (idx < races.length) {
      const myIdx = idx++;
      const r = races[myIdx];
      const v9Race = v9Map[r.raceNo];
      try {
        const result = await pickRace(r, v9Race, horseMap, date, `${date} R${r.raceNo}`);
        picks[myIdx] = result;
        const p = result.pick;
        console.log(`  R${r.raceNo}: ${p.action.toUpperCase()} ${p.t1 || '-'}+${p.t2 || '-'} conf=${p.confidence} (${result.durationMs}ms in=${result.usage.input_tokens} out=${result.usage.output_tokens} cR=${result.usage.cache_read_input_tokens || 0})`);
      } catch (e) {
        console.error(`  R${r.raceNo} ERROR: ${e.message}`);
        picks[myIdx] = { raceNo: r.raceNo, error: e.message };
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const out = { date, venue: data.venue, model: MODEL, level: 'C', picks };
  const outPath = path.join(OUT_DIR, `claude-picks-c-${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  const totalIn = picks.reduce((s, p) => s + (p?.usage?.input_tokens || 0), 0);
  const totalOut = picks.reduce((s, p) => s + (p?.usage?.output_tokens || 0), 0);
  const totalCache = picks.reduce((s, p) => s + (p?.usage?.cache_read_input_tokens || 0), 0);
  console.log(`  → ${outPath} | tokens in=${totalIn} out=${totalOut} cached=${totalCache}`);
  return { date, totalIn, totalOut, totalCache };
}

async function main() {
  const args = process.argv.slice(2);
  const dates = args.length ? args : DATES;
  const summary = [];
  for (const d of dates) {
    const s = await processDate(d);
    if (s) summary.push(s);
  }
  console.log('\n=== Token Summary ===');
  let grandIn = 0, grandOut = 0, grandCache = 0;
  for (const s of summary) {
    grandIn += s.totalIn; grandOut += s.totalOut; grandCache += s.totalCache;
  }
  console.log(`Total input: ${grandIn} (cached: ${grandCache})`);
  console.log(`Total output: ${grandOut}`);
  const cost = grandIn * 15 / 1e6 + grandCache * 1.5 / 1e6 + grandOut * 75 / 1e6;
  console.log(`Estimated cost: $${cost.toFixed(3)} USD`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
