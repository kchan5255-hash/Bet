// update-results.js — 流程 B：賽後賽果 + 派彩更新
// 用法: node update-results.js <date> [venue] [races]
// 例如: node update-results.js 2026-05-20 HV 9
//
// 步驟:
//   [1/4] results-full-scraper.js   → results-full-<date>.json
//   [2/4] dividends-scraper.js      → dividends-<date>.json
//   [3/4] build-race-results-by-date.js → race-results-by-date.json
//   [4/4] build-dividends-by-date.js    → dividends-by-date.json

const { spawnSync } = require('child_process');
const path = require('path');

const [date, venue = 'ST', races = '10'] = process.argv.slice(2);
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('用法: node update-results.js <date> [venue] [races]');
  console.error('例如: node update-results.js 2026-05-20 HV 9');
  process.exit(1);
}

const ROOT = __dirname;

function run(label, cmd, args, env = {}) {
  console.log(`\n${label}`);
  const result = spawnSync('node', [cmd, ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    console.error(`✗ 失敗 (exit ${result.status})`);
    process.exit(result.status || 1);
  }
  console.log(`✓ 完成`);
}

console.log(`=== 流程 B：賽果 + 派彩更新 ${date} ${venue} ${races}場 ===`);

run('[1/4] 爬取賽果', 'results-full-scraper.js', [], {
  DATE: date,
  VENUE: venue,
  RACES: String(races),
});

run('[2/4] 爬取派彩', 'dividends-scraper.js', [], {
  DATE: date,
  VENUE: venue,
  RACES: String(races),
});

run('[3/4] 聚合賽果 → race-results-by-date.json', 'build-race-results-by-date.js', []);
run('[4/4] 聚合派彩 → dividends-by-date.json', 'build-dividends-by-date.js', []);

console.log(`\n=== 完成！前端 /results 頁已更新 (${date} ${venue} ${races}場) ===`);
