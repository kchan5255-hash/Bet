// update-prediction.js — 流程 A：賽前勝率預測更新
// 用法: node update-prediction.js <date>
// 例如: node update-prediction.js 2026-05-20
//
// 步驟:
//   [1/3] build-analysis-from-graphql.js  → analysis-by-date.json
//   [2/3] model-v19.js <date>             → backtest-v19-<date>.json
//   [3/3] export-v19-to-web.js <date>     → v19.json

const { spawnSync } = require('child_process');
const path = require('path');

const date = process.argv[2];
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('用法: node update-prediction.js <date>  (例: 2026-05-20)');
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

console.log(`=== 流程 A：勝率預測更新 ${date} ===`);

run('[1/3] 建立 analysis-by-date.json', 'build-analysis-from-graphql.js', []);
run('[2/3] 執行 V19 模型', 'model-v19.js', [date]);
run('[3/3] 匯出 v19.json 至前端', 'export-v19-to-web.js', [date]);

console.log(`\n=== 完成！前端 /races 頁已更新 ===`);
