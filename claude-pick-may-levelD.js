// claude-pick-may-levelD.js
// Level D：Claude 做 V12 picks 嘅 sanity-check
// V12 揀 → Claude 三選一：confirm / reduce / skip
// Claude 只能減倉位或跳場，唔可以加場
//
// 用法：node claude-pick-may-levelD.js [date1 date2 ...]

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-opus-4-6';
const DATES = ['2026-05-03', '2026-05-06', '2026-05-09', '2026-05-13', '2026-05-17'];
const OUT_DIR = 'd:/AI/Bet/data/claude-picks-d';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const SYSTEM_PROMPT = `你係香港賽馬連贏分析員嘅 sanity-checker。

V12 模型已經用 hard rules 揀咗一場連贏單注 t1+t2。V12 嘅 picks 喺 backtest 有 +1000% ROI（4 季 200+ 賽馬日）— 你要尊重 V12 嘅判斷。

你嘅唯一任務：sanity-check 呢個 V12 pick 有冇明顯問題。三個 action 揀一個：

- **confirm**：V12 揀法合理，照落 100% 注額
- **reduce**：V12 揀法 OK 但有少少 concern（例如 T2 跑法配合一般、跑道偏僻）→ 減半注額至 50%
- **skip**：V12 揀法有嚴重問題（例如 T1 上仗大敗、跑道完全唔啱、近期狀態崩）→ 跳過呢場

Hard constraint：
- 你唔可以建議揀其他馬（即係冇 t1/t2 override）
- 預設 confirm — skip 同 reduce 要有強烈 narrative 理由
- 信心度 0-100：你對自己呢個 sanity-check 嘅信心

只用提供嘅 numerical features + records 推理。

只輸出 JSON（無 markdown fence）：
{"action":"confirm"|"reduce"|"skip","confidence":<0-100>,"reason":"<60字內>"}`;

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

function buildPrompt(race, v9Race, v12Race, horseMap, raceDateStr) {
  const meta = race.meta || {};
  const cutoff = new Date(raceDateStr);
  const sig = v9Race?.signals || {};
  const rec = v12Race.recommend;
  const lines = [
    `# V12 Pick Review — ${raceDateStr} 第 ${race.raceNo} 場`,
    `班次：${meta.className} | 距離：${meta.distance}m | 場地：${meta.going} | 跑道：${meta.course} | 出賽：${sig.fieldSize}匹`,
    '',
    '## V12 Pick',
    `T1=${rec.qinT12.combo.split(',')[0]} | T2=${rec.qinT12.combo.split(',')[1]} | tier=${rec.tier}`,
    `V12 觸發指標：reliability=${rec.metrics.reliability} | prob=${rec.metrics.prob}% | suitability=${rec.metrics.suitability} | records=${rec.metrics.records} | v9-t1-prob=${rec.metrics.v9T1Prob}% | t2-rel=${rec.metrics.t2Reliability} | body-rel=${rec.metrics.bodyRel} | top1-shape=${rec.metrics.top1Shape} | draw-rel=${rec.metrics.drawRel}`,
    '',
    '## Race Signals',
    `topGap=${fmtNum(sig.topGap, 2)} | top2Reliability=${fmtNum(sig.top2Reliability, 3)} | top1Shape=${fmtNum(sig.top1Shape, 3)} | top1Prob=${fmtNum(sig.top1Prob, 1)}%`,
    '',
    '## Pro Top 5 馬',
  ];
  const v9Top = (v9Race?.v9Ranking || []).slice(0, 5);
  for (const v9 of v9Top) {
    const h = horseMap[v9.code];
    const records = (h?.records || [])
      .filter((r) => {
        const d = parseRecordDate(r.date);
        return d && d < cutoff;
      })
      .slice(0, 6);
    const isT1 = String(v9.no) === rec.qinT12.combo.split(',')[0];
    const isT2 = String(v9.no) === rec.qinT12.combo.split(',')[1];
    const tag = isT1 ? ' ← V12 T1' : isT2 ? ' ← V12 T2' : '';
    lines.push(`\n### ${v9.no}. ${v9.name}（${v9.displayJockey || v9.jockey} / ${v9.displayTrainer || v9.trainer}）${tag}`);
    lines.push(`prob=${fmtNum(v9.prob, 1)}% | reliability=${fmtNum(v9.reliability, 3)} | records=${v9.records || 0} | 檔=${v9.draw} | 評分=${v9.rating}`);
    if (v9.groups) {
      lines.push(`groups: formCycle=${fmtNum(v9.groups.formCycle, 2)} | provenAbility=${fmtNum(v9.groups.provenAbility, 2)} | suitability=${fmtNum(v9.groups.suitability, 2)} | raceShape=${fmtNum(v9.groups.raceShape, 2)}`);
    }
    if (records.length) {
      lines.push('近6場：');
      for (const r of records) {
        lines.push(`  ${r.date} ${r.track || ''} ${r.distance}m ${r.going} cl${r.classNo} 檔${r.draw} → 名次 ${r.place} (LBW ${r.lbw} odds ${r.odds})`);
      }
    }
  }
  return lines.join('\n');
}

async function reviewPick(race, v9Race, v12Race, horseMap, raceDateStr, ctx) {
  const userText = buildPrompt(race, v9Race, v12Race, horseMap, raceDateStr);
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
      console.warn(`  [retry ${attempt + 1}] ${ctx} → ${e.message}`);
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
    parsed = { action: 'confirm', confidence: 0, reason: 'parse_error', raw: text };
  }
  return { review: parsed, usage: resp.usage, durationMs: dt };
}

async function processDate(date) {
  const resultsPath = `d:/AI/Bet/data/results/2026/results-full-${date}.json`;
  const v9Path = `d:/AI/Bet/data/backtest/v9/2026/backtest-v9-${date}.json`;
  const v12Path = `d:/AI/Bet/data/backtest/v12/2026/backtest-v12-${date}.json`;
  const allHorsesPath = `d:/AI/Bet/data/horses/horses-all.json`;
  const dailyHorsesPath = `d:/AI/Bet/data/horses/horses-${date}.json`;
  if (!fs.existsSync(resultsPath) || !fs.existsSync(v12Path)) return null;
  const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const v9Data = JSON.parse(fs.readFileSync(v9Path, 'utf8'));
  const v12Data = JSON.parse(fs.readFileSync(v12Path, 'utf8'));
  const v9Map = Object.fromEntries(v9Data.races.map((r) => [r.raceNo, r]));
  const v12Map = Object.fromEntries(v12Data.races.map((r) => [r.raceNo, r]));
  const horseMap = {};
  if (fs.existsSync(dailyHorsesPath)) {
    for (const h of JSON.parse(fs.readFileSync(dailyHorsesPath, 'utf8')).horses) horseMap[h.code] = h;
  }
  if (fs.existsSync(allHorsesPath)) {
    for (const h of JSON.parse(fs.readFileSync(allHorsesPath, 'utf8')).horses) {
      if (!horseMap[h.code]) horseMap[h.code] = h;
    }
  }
  const v12Picks = data.races.filter((r) => v12Map[r.raceNo]?.recommend);
  if (v12Picks.length === 0) {
    console.log(`${date}: 0 V12 picks, skip`);
    return null;
  }
  console.log(`\n=== ${date}: ${v12Picks.length} V12 picks ===`);
  const reviews = [];
  for (const r of v12Picks) {
    const v12Race = v12Map[r.raceNo];
    const v9Race = v9Map[r.raceNo];
    try {
      const result = await reviewPick(r, v9Race, v12Race, horseMap, date, `${date} R${r.raceNo}`);
      const rev = result.review;
      console.log(`  R${r.raceNo} V12=${v12Race.recommend.qinT12.combo} → ${rev.action.toUpperCase()} (conf=${rev.confidence}) "${rev.reason}"`);
      reviews.push({ raceNo: r.raceNo, v12Pick: v12Race.recommend.qinT12.combo, review: rev, usage: result.usage });
    } catch (e) {
      console.error(`  R${r.raceNo} ERROR: ${e.message}`);
    }
  }
  const out = { date, model: MODEL, level: 'D', reviews };
  fs.writeFileSync(path.join(OUT_DIR, `claude-picks-d-${date}.json`), JSON.stringify(out, null, 2), 'utf8');
  return reviews;
}

async function main() {
  const args = process.argv.slice(2);
  const dates = args.length ? args : DATES;
  let totalIn = 0, totalOut = 0, totalCache = 0;
  for (const d of dates) {
    const reviews = await processDate(d);
    if (!reviews) continue;
    for (const r of reviews) {
      totalIn += r.usage?.input_tokens || 0;
      totalOut += r.usage?.output_tokens || 0;
      totalCache += r.usage?.cache_read_input_tokens || 0;
    }
  }
  const cost = totalIn * 15 / 1e6 + totalCache * 1.5 / 1e6 + totalOut * 75 / 1e6;
  console.log(`\nTokens in=${totalIn} cached=${totalCache} out=${totalOut} | Cost: $${cost.toFixed(3)}`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
