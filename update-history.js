// update-history.js — 流程 C：賽後歷史記錄更新
// 用法: node update-history.js <date>
// 例如: node update-history.js 2026-05-20
//
// 步驟:
//   [1/2] model-v19.js <date>          → backtest-v19-<date>.json (含 actualTop3)
//   [2/2] export-v19-to-web.js         → v19.json (全期)

const { spawnSync } = require('child_process');
const path = require('path');

const date = process.argv[2];
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('用法: node update-history.js <date>  (例: 2026-05-20)');
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

console.log(`=== 流程 C：歷史記錄更新 ${date} ===`);

run('[1/2] 執行 V19 模型（含賽果）', 'model-v19.js', [date]);
run('[2/2] 匯出 v19.json 至前端（全期）', 'export-v19-to-web.js', []);

console.log(`\n=== 完成！前端 /history 頁已更新 ===`);
