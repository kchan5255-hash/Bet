// claude-pick-may.js
// Level A 對比實驗：用 Claude Opus 4.6 揀馬，對比 V12 連贏單注表現
// Input：race meta + 14 隻馬 profile + 各馬最近 6 場 records（純文字，無 derived feature）
// Output：每場揀 t1, t2, action(play/skip), confidence, reason
//
// 用法：node claude-pick-may.js [date1 date2 ...]
//   不帶參數則跑 5/3, 5/6, 5/9, 5/13, 5/17 全部

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-opus-4-6';
const DATES = ['2026-05-03', '2026-05-06', '2026-05-09', '2026-05-13', '2026-05-17'];
const CONCURRENCY = 3;
const OUT_DIR = 'd:/AI/Bet/data/claude-picks';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const SYSTEM_PROMPT = `你係香港賽馬連贏分析員。每場 race 收到：賽事資料 + 全部出賽馬匹 profile 同最近往績。

你嘅任務：揀「連贏單注」嘅 T1+T2（兩匹馬必須同時跑入頭兩名先中），或者 skip。

連贏中獎條件：T1 + T2 兩匹馬 = 實際冠亞軍（次序唔重要）。
HKJC 連贏抽水 17.5%，所以 break-even 中獎率 ~16%（field 12-14 隻時隨機 ~15-18%）。
要 +ve EV，揀嘅組合中獎率要顯著高於市場 implied。

決策原則：
- 唔好每場都 play。冇明顯 edge 就 skip。
- 揀「組合穩」過「拼長賠」。低派彩高命中率係正路。
- 信心 0-100：50 = coin flip，70+ = 高信心，<40 = 唔好 play。

只用提供嘅資料，唔可以幻想未列出嘅嘢。

只輸出 JSON（無 markdown fence）：
{"action":"play"|"skip","t1":"<馬號>","t2":"<馬號>","confidence":<0-100>,"reason":"<30字內>"}`;

// 將 records 嘅日期字串 (dd/MM/yy 或 dd/MM/yyyy) 轉成 Date，用嚟過濾 lookahead
function parseRecordDate(s) {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  y = y.length === 2 ? '20' + y : y;
  return new Date(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`);
}

function buildRacePrompt(race, horseMap, raceDateStr) {
  const meta = race.meta || {};
  const cutoff = new Date(raceDateStr);
  const lines = [
    `# 第 ${race.raceNo} 場`,
    `班次：${meta.className || '?'} | 距離：${meta.distance || '?'}m | 場地：${meta.going || '?'} | 跑道：${meta.course || '?'}`,
    '',
    '## 出賽馬匹',
  ];
  for (const r of race.runners) {
    const h = horseMap[r.code];
    const profile = h?.profile || {};
    // 只保留 race date 之前嘅 records，避免 lookahead leakage
    const records = (h?.records || [])
      .filter((rec) => {
        const d = parseRecordDate(rec.date);
        return d && d < cutoff;
      })
      .slice(0, 6);
    lines.push(`\n### ${r.no}. ${r.name} (${r.code})`);
    lines.push(`騎師：${r.jockey} | 練馬師：${r.trainer} | 檔位：${r.draw}`);
    if (profile['Country of Origin / Age']) lines.push(`產地/年齡：${profile['Country of Origin / Age']}`);
    if (profile['No. of 1-2-3-Starts*']) lines.push(`歷年 1-2-3-總出賽：${profile['No. of 1-2-3-Starts*']}`);
    if (profile['Current Rating']) lines.push(`現評分：${profile['Current Rating']} (季初 ${profile['Start of Season Rating'] || '?'})`);
    if (profile['Sire']) lines.push(`父系：${profile['Sire']}`);
    if (records.length) {
      lines.push('近場成績（新→舊）：');
      for (const rec of records) {
        lines.push(`  ${rec.date} ${rec.track} ${rec.distance}m ${rec.going} cl${rec.classNo} 檔${rec.draw} 評${rec.rating} → 名次 ${rec.place} (LBW ${rec.lbw} odds ${rec.odds})`);
      }
    } else {
      lines.push('近場成績：無');
    }
  }
  return lines.join('\n');
}

async function pickRace(race, horseMap, raceDateStr, ctx) {
  const userText = buildRacePrompt(race, horseMap, raceDateStr);
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
  return {
    raceNo: race.raceNo,
    pick: parsed,
    usage: resp.usage,
    durationMs: dt,
  };
}

async function processDate(date) {
  const resultsPath = `d:/AI/Bet/data/results/2026/results-full-${date}.json`;
  const dailyHorsesPath = `d:/AI/Bet/data/horses/horses-${date}.json`;
  const allHorsesPath = `d:/AI/Bet/data/horses/horses-all.json`;
  if (!fs.existsSync(resultsPath)) {
    console.warn(`SKIP ${date}: missing results`);
    return null;
  }
  const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  // 優先用日 horses file，缺嘅 fallback 去 horses-all（並用 raceDate 過濾 records）
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
  async function worker(workerId) {
    while (idx < races.length) {
      const myIdx = idx++;
      const r = races[myIdx];
      try {
        const result = await pickRace(r, horseMap, date, `${date} R${r.raceNo}`);
        picks[myIdx] = result;
        const p = result.pick;
        console.log(`  R${r.raceNo}: ${p.action.toUpperCase()} ${p.t1 || '-'}+${p.t2 || '-'} conf=${p.confidence} (${result.durationMs}ms, in=${result.usage.input_tokens} out=${result.usage.output_tokens} cacheR=${result.usage.cache_read_input_tokens || 0})`);
      } catch (e) {
        console.error(`  R${r.raceNo} ERROR: ${e.message}`);
        picks[myIdx] = { raceNo: r.raceNo, error: e.message };
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

  const out = { date, venue: data.venue, model: MODEL, picks };
  const outPath = path.join(OUT_DIR, `claude-picks-${date}.json`);
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
  // Opus 4.6 pricing (per MTok): in $15, out $75, cache write $18.75, cache read $1.50
  // input_tokens 喺 SDK 已唔包 cached，直接 ×$15；cached read tokens 另計 ×$1.50
  const cost = grandIn * 15 / 1e6 + grandCache * 1.5 / 1e6 + grandOut * 75 / 1e6;
  console.log(`Estimated cost: $${cost.toFixed(3)} USD`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
