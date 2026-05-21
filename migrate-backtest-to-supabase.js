// migrate-backtest-to-supabase.js
// 一次性將 data/backtest/v19/{year}/backtest-v19-<date>.json 灌入 Supabase v19_predictions 表
//
// 用法：
//   USE_SUPABASE=1 node migrate-backtest-to-supabase.js
//   USE_SUPABASE=1 FROM=2026-01-01 TO=2026-12-31 node migrate-backtest-to-supabase.js
//   USE_SUPABASE=1 DRY_RUN=1 node migrate-backtest-to-supabase.js   ← 只統計唔寫入

const fs = require('fs');
const path = require('path');
const paths = require('./paths');
const { v19RowFromRace, upsertV19Predictions } = require('./supabase-data');

const FROM = process.env.FROM || '';
const TO = process.env.TO || '';
const DRY_RUN = process.env.DRY_RUN === '1';

function listV19Backtests() {
  const out = [];
  for (const yr of ['2024', '2025', '2026']) {
    const dir = path.join(paths.DIRS.backtest, 'v19', yr);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/backtest-v19-(\d{4}-\d{2}-\d{2})\.json$/);
      if (!m) continue;
      const date = m[1];
      if (FROM && date < FROM) continue;
      if (TO && date > TO) continue;
      out.push({ date, file: path.join(dir, f) });
    }
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

(async () => {
  const files = listV19Backtests();
  if (!files.length) {
    console.log('No v19 backtest files found.');
    return;
  }

  console.log(`Found ${files.length} backtest files (${files[0].date} → ${files[files.length - 1].date})`);
  if (DRY_RUN) console.log('[DRY-RUN] 唔會寫入 DB');

  let totalRaces = 0;
  let totalDates = 0;
  for (const { date, file } of files) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const venue = data.venue || '';
    const mode = data.mode || 'post';
    const races = data.races || [];
    if (!races.length) continue;

    const rows = races.map((r) => v19RowFromRace(date, venue, r, mode));
    if (!DRY_RUN) {
      await upsertV19Predictions(rows);
    }
    totalRaces += rows.length;
    totalDates++;
    process.stdout.write(`  ${date} (${venue}, ${mode}): ${rows.length} races\n`);
  }

  console.log(`\n完成：${totalDates} 日 / ${totalRaces} 場${DRY_RUN ? ' [DRY-RUN]' : ''}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
