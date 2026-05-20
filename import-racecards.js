// import-racecards.js
// 從本地 results-full-*.json 匯入賽前數據到 Supabase race_cards 表
// （歷史賽事 GraphQL API 已無法取得，所以從賽果反推賽前數據）
//
// 用法: node import-racecards.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const paths = require('./paths');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

(async () => {
  const collected = [];
  const resultsRoot = paths.DIRS.results;
  if (fs.existsSync(resultsRoot)) {
    for (const year of fs.readdirSync(resultsRoot)) {
      const yearDir = path.join(resultsRoot, year);
      if (!fs.statSync(yearDir).isDirectory()) continue;
      for (const f of fs.readdirSync(yearDir)) {
        if (/^results-full-\d{4}-\d{2}-\d{2}\.json$/.test(f)) {
          collected.push(path.join(yearDir, f));
        }
      }
    }
  }
  for (const f of fs.readdirSync('.')) {
    if (/^results-full-\d{4}-\d{2}-\d{2}\.json$/.test(f)) collected.push(path.resolve(f));
  }
  const files = [...new Set(collected)].sort();

  console.log(`找到 ${files.length} 個 results-full 檔案`);

  let totalRows = 0;
  let processed = 0;

  for (const file of files) {
    const date = path.basename(file).match(/results-full-(\d{4}-\d{2}-\d{2})/)[1];
    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      console.log(`[跳過] ${file} 解析失敗`);
      continue;
    }

    const rows = [];
    for (const race of data.races || []) {
      if (!race.runners) continue;
      for (const r of race.runners) {
        if (!r.no) continue;
        rows.push({
          date,
          venue:           data.venue,
          race_no:         race.raceNo,
          class_name:      race.meta?.className || null,
          distance:        race.meta?.distance  || null,
          going:           race.meta?.going     || null,
          course:          race.meta?.course    || null,
          horse_no:        r.no,
          horse_name:      r.name || null,
          horse_code:      r.code || null,
          draw:            r.draw || null,
          handicap_weight: r.actualWeight || null,
          body_weight:     r.bodyWeight || null,
          jockey:          r.jockey || null,
          trainer:         r.trainer || null,
          win_odds:        r.winOdds || null,
          status:          /^\d+$/.test(r.plc) ? 'Finished' : (r.plc || null),
          scraped_at:      data.scrapedAt || new Date().toISOString(),
        });
      }
    }

    if (rows.length) {
      // Supabase 一次最多插入約 1000 行，分批
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('race_cards')
          .upsert(chunk, { onConflict: 'date,venue,race_no,horse_no' });
        if (error) {
          console.error(`  [${date}] 第 ${i}-${i + chunk.length} 筆 error:`, error.message);
          break;
        }
      }
      totalRows += rows.length;
    }

    processed++;
    process.stdout.write(`\r[${processed}/${files.length}] ${date} (${data.venue}) ${rows.length} 筆 | 總計 ${totalRows} 筆     `);
  }

  console.log(`\n完成！匯入 ${totalRows} 筆 race_cards 記錄`);
})();
