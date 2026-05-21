// commentary.js
// 用 Claude Sonnet 4.6 為 V19 推介場生成 1-2 句中文 tipster 點評。
// - prompt caching（system + few-shot 用 1h ephemeral cache）
// - disk cache：data/commentary-cache.json，按 race signature 去重
// - 失敗時 throw，由呼叫者決定 skip / retry

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk').default;

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 300;
const CACHE_FILE = path.join(__dirname, 'data', 'commentary-cache.json');

const SYSTEM_PROMPT = `你係香港賽馬資深 tipster，根據 V19 模型嘅推介資料，用繁體中文寫 60-100 字嘅精煉點評，幫賭仔快速理解推介理由。

要求：
- 每場以兩句為限
- 語氣專業直接，避免空泛形容詞（如「值得期待」「實力不俗」）
- 用具體事實：騎師×練馬師勝率、距離強區、擋位、班次
- 唔好重複馬號，直接用馬名
- 唔好寫「建議下注」「祝君好運」呢類客套
- 如果係 Tier S 高信心，可以講得肯定啲；Tier B 低信心，要點出風險或保守玩法`;

const FEW_SHOT = [
  {
    role: 'user',
    content: `Tier A 推介
連贏膽拖：膽 #2 嵐臣，拖 #1 包裝明將、#10 隋我同來
場次：第4班 1400 米，14 匹出賽
推介理由：jt-good（騎練組合勝率 ≥10%）、middle-boost（1400 米 V19 強區）、頭馬擋位第 1 檔`,
  },
  {
    role: 'assistant',
    content: '嵐臣騎練配搭良好，1400 米屬 V19 強勢區間，加上內檔起步優勢，勝出機會明顯。配 #1 包裝明將、#10 隋我同來做拖腳，三匹形態合理組成穩陣連贏膽拖。',
  },
  {
    role: 'user',
    content: `Tier S 推介
連贏膽拖：膽 #3 巴閉王，拖 #5 星運少爵、#8 雷神太保
場次：第4班 1200 米，12 匹出賽
推介理由：jt-elite（騎練組合勝率 ≥18%）、t-elite=11.4%（練馬師精英級）、頭馬擋位第 3 檔`,
  },
  {
    role: 'assistant',
    content: '巴閉王得騎練精英組合加持，練馬師近期勝率 11.4% 屬同期最高班，擋位中性無礙發揮，係今場最有底嘅膽腳。星運少爵、雷神太保支持度同樣紮實，連贏膽拖值博。',
  },
  {
    role: 'user',
    content: `Tier B 推介
連贏膽拖：膽 #8 包好運，拖 #14 星光燦爛、#3 雷霆萬鈞
場次：第4班 1200 米，14 匹出賽
推介理由：頭馬擋位第 3 檔`,
  },
  {
    role: 'assistant',
    content: '包好運只憑擋位優勢入選，缺乏騎練配搭或距離加成等強信號，信心度偏低。建議減注或只玩細注連贏，避免重注膽拖。',
  },
];

let _client = null;
function client() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY 未設置');
    }
    _client = new Anthropic();
  }
  return _client;
}

let _diskCache = null;
function loadDiskCache() {
  if (_diskCache) return _diskCache;
  try {
    _diskCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    _diskCache = {};
  }
  return _diskCache;
}

function saveDiskCache() {
  if (!_diskCache) return;
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(_diskCache, null, 2), 'utf8');
}

function tierLabel(tier) {
  if (tier === 'S') return 'Tier S 高信心';
  if (tier === 'A') return 'Tier A 中信心';
  return 'Tier B 低信心';
}

function translateBoost(boost) {
  if (!boost) return null;
  if (boost === 'middle' || boost.startsWith('middle-boost')) {
    return 'middle-boost（1400/1600 米 V19 強區）';
  }
  return boost;
}

function translateReason(raw) {
  const r = String(raw).trim();
  const lower = r.toLowerCase();
  if (lower === 'jt-elite') return 'jt-elite（騎練組合勝率 ≥18%）';
  if (lower === 'jt-good') return 'jt-good（騎練組合勝率 ≥10%）';
  if (lower.startsWith('j-elite')) {
    const m = r.match(/=([\d.]+)%?/);
    return m ? `j-elite=${m[1]}%（騎師精英級）` : 'j-elite（騎師精英級）';
  }
  if (lower.startsWith('t-elite')) {
    const m = r.match(/=([\d.]+)%?/);
    return m ? `t-elite=${m[1]}%（練馬師精英級）` : 't-elite（練馬師精英級）';
  }
  if (lower.startsWith('draw=')) {
    const m = r.match(/=(\d+)/);
    return m ? `頭馬擋位第 ${m[1]} 檔` : null;
  }
  if (lower.startsWith('class=') || lower.startsWith('field=') || lower.startsWith('middle-boost')) {
    return null;
  }
  return r;
}

function buildSignature(race, nameByNo) {
  const rec = race.recommend || {};
  const t12 = rec.qinT12?.combo || '';
  const banker = (rec.qinBanker || []).map((c) => c.combo).join('|');
  const reasons = (race.gate?.reasons || []).slice().sort().join(',');
  const keyParts = [
    rec.tier || '',
    t12,
    banker,
    reasons,
    race.gate?.boost || '',
    race.gate?.draw ?? '',
    race.gate?.class ?? '',
    race.fieldSize ?? '',
    race.meta?.distance || '',
    Array.from(nameByNo.values()).join('|'),
  ];
  return crypto.createHash('sha1').update(keyParts.join('::')).digest('hex').slice(0, 16);
}

function buildUserPrompt(race, nameByNo) {
  const rec = race.recommend;
  const tier = tierLabel(rec.tier);
  const banker = (rec.qinBanker || [])
    .map((c) => c.combo.split(',').map((n) => n.trim()))
    .filter((p) => p.length === 2);
  if (banker.length === 0) return null;

  const counts = new Map();
  for (const [a, b] of banker) {
    counts.set(a, (counts.get(a) ?? 0) + 1);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  let bankerNo = banker[0][0];
  let max = 0;
  for (const [no, count] of counts) {
    if (count > max) { max = count; bankerNo = no; }
  }
  const legSet = new Set();
  for (const [a, b] of banker) {
    if (a !== bankerNo) legSet.add(a);
    if (b !== bankerNo) legSet.add(b);
  }
  const formatHorse = (no) => `#${no} ${nameByNo.get(no) || ''}`.trim();
  const bankerStr = formatHorse(bankerNo);
  const legsStr = Array.from(legSet).map(formatHorse).join('、');

  const reasonLines = [];
  for (const r of race.gate?.reasons || []) {
    const t = translateReason(r);
    if (t) reasonLines.push(t);
  }
  const boost = translateBoost(race.gate?.boost);
  if (boost) reasonLines.push(boost);
  const reasonsStr = reasonLines.length ? reasonLines.join('、') : '（無特殊理由）';

  const dist = race.meta?.distance || '';
  const cls = race.gate?.class != null ? `第${race.gate.class}班` : (race.meta?.className || '');
  const field = race.fieldSize != null ? `${race.fieldSize} 匹出賽` : '';
  const venueLine = [cls, dist ? `${dist} 米` : '', field].filter(Boolean).join('，');

  return `${tier} 推介
連贏膽拖：膽 ${bankerStr}，拖 ${legsStr}
場次：${venueLine}
推介理由：${reasonsStr}`;
}

async function generateCommentary(race, nameByNo) {
  if (!race.recommend) return null;
  const userPrompt = buildUserPrompt(race, nameByNo);
  if (!userPrompt) return null;

  const cache = loadDiskCache();
  const sig = buildSignature(race, nameByNo);
  if (cache[sig]) return cache[sig];

  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [{
      type: 'text',
      text: SYSTEM_PROMPT,
      cache_control: { type: 'ephemeral', ttl: '1h' },
    }],
    messages: [
      ...FEW_SHOT,
      { role: 'user', content: userPrompt },
    ],
  });

  const textBlock = resp.content.find((b) => b.type === 'text');
  const commentary = textBlock?.text?.trim() || null;
  if (commentary) {
    cache[sig] = commentary;
    saveDiskCache();
  }
  return commentary;
}

module.exports = { generateCommentary, buildSignature, buildUserPrompt };
