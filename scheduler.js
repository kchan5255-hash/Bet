// scheduler.js — 逐場排程器
// 根據 postTime 自動在每場結束後爬取賽果並更新前端
//
// 用法: node scheduler.js <date> [venue]
// 例如: node scheduler.js 2026-05-20 HV

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [date, venue = 'ST'] = process.argv.slice(2);
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('用法: node scheduler.js <date> [venue]');
  console.error('例如: node scheduler.js 2026-05-20 HV');
  process.exit(1);
}

const ROOT = __dirname;
const ANALYSIS_FILE = path.join(ROOT, 'web', 'src', 'data', 'analysis-by-date.json');
const BUFFER_MINUTES = 15; // postTime + 15 分鐘後觸發

// ── 讀取當日各場 postTime ────────────────────────────────────────────────────

function loadRaces() {
  if (!fs.existsSync(ANALYSIS_FILE)) {
    console.error(`找不到 ${ANALYSIS_FILE}`);
    process.exit(1);
  }
  const analysis = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf8'));
  const races = (analysis.byDate || {})[date];
  if (!Array.isArray(races) || races.length === 0) {
    console.error(`analysis-by-date.json 中找不到 ${date} 的資料`);
    process.exit(1);
  }
  return races;
}

// ── 解析 postTime "HH:MM" → 今日 Date 物件 ──────────────────────────────────

function parsePostTime(timeStr) {
  // timeStr 格式: "18:40" 或 "2:40PM" 等，統一處理 HH:MM
  const m = String(timeStr).match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  let min = parseInt(m[2], 10);
  // 若有 PM 且小時 < 12，加 12
  if (/pm/i.test(timeStr) && h < 12) h += 12;
  const d = new Date();
  d.setFullYear(
    parseInt(date.slice(0, 4), 10),
    parseInt(date.slice(5, 7), 10) - 1,
    parseInt(date.slice(8, 10), 10),
  );
  d.setHours(h, min, 0, 0);
  return d;
}

function formatTime(d) {
  return d.toTimeString().slice(0, 5);
}

function formatCountdown(ms) {
  if (ms <= 0) return '立即';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── 執行單一腳本 ─────────────────────────────────────────────────────────────

function run(label, cmd, args, env = {}) {
  process.stdout.write(`  ${label}... `);
  const result = spawnSync('node', [cmd, ...args], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    console.log('✗');
    const errMsg = result.stderr?.toString().trim();
    if (errMsg) console.error(`    ${errMsg.split('\n')[0]}`);
    return false;
  }
  console.log('✓');
  return true;
}

// ── 處理單場更新 ─────────────────────────────────────────────────────────────

function processRace(raceNo) {
  const ts = new Date().toTimeString().slice(0, 5);
  console.log(`\n[${ts}] Race ${raceNo} 爬取中...`);

  const env = { DATE: date, VENUE: venue, RACES: String(raceNo) };
  run('爬取賽果', 'results-full-scraper.js', [], env);
  run('爬取派彩', 'dividends-scraper.js', [], env);
  run('聚合賽果', 'build-race-results-by-date.js', []);
  run('聚合派彩', 'build-dividends-by-date.js', []);

  console.log(`  ✓ Race ${raceNo} 更新完成`);
}

// ── 最後一場後執行歷史更新 ───────────────────────────────────────────────────

function processHistory() {
  const ts = new Date().toTimeString().slice(0, 5);
  console.log(`\n[${ts}] 執行歷史記錄更新...`);
  run('V19 模型（含賽果）', 'model-v19.js', [date]);
  run('匯出 v19.json（全期）', 'export-v19-to-web.js', []);
  console.log(`  ✓ /history 頁已更新`);
}

// ── 主流程 ───────────────────────────────────────────────────────────────────

const races = loadRaces();
const now = Date.now();

console.log(`\n=== 逐場排程器 ${date} ${venue} ===`);
console.log(`緩衝時間: +${BUFFER_MINUTES} 分鐘\n`);

const scheduled = [];

for (const race of races) {
  const raceNo = race.raceNo;
  const postTime = parsePostTime(race.postTime);
  if (!postTime) {
    console.warn(`Race ${raceNo}: 無法解析 postTime "${race.postTime}"，跳過`);
    continue;
  }

  const triggerTime = new Date(postTime.getTime() + BUFFER_MINUTES * 60 * 1000);
  const delay = triggerTime.getTime() - now;

  if (delay < -5 * 60 * 1000) {
    // 超過 5 分鐘前已過，跳過
    console.log(`Race ${raceNo}  postTime ${formatTime(postTime)}  → 已過，跳過`);
    continue;
  }

  const effectiveDelay = Math.max(0, delay);
  const countdown = formatCountdown(effectiveDelay);
  console.log(`Race ${raceNo}  排程於 ${formatTime(triggerTime)}  (距今 ${countdown})`);
  scheduled.push({ raceNo, triggerTime, delay: effectiveDelay });
}

if (scheduled.length === 0) {
  console.log('\n沒有需要排程的場次。');
  process.exit(0);
}

console.log(`\n共排程 ${scheduled.length} 場，保持此 terminal 開著...\n`);

// 設定 setTimeout 逐場觸發
let completedCount = 0;
const lastRaceNo = scheduled[scheduled.length - 1].raceNo;

for (const { raceNo, delay } of scheduled) {
  setTimeout(() => {
    processRace(raceNo);
    completedCount++;

    if (raceNo === lastRaceNo) {
      // 最後一場完成後，額外執行歷史更新
      setTimeout(processHistory, 3000);
    }

    if (completedCount === scheduled.length) {
      setTimeout(() => {
        console.log(`\n=== 全部 ${scheduled.length} 場完成！===`);
        process.exit(0);
      }, 5000);
    }
  }, delay);
}
