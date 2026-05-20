// import-horses-to-supabase.js
// 從 horses-all.json 重新匯入所有馬匹往績和檔案到 Supabase
// 用於補救之前因 unique 約束問題沒寫入的數據
//
// 用法: node import-horses-to-supabase.js

require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const paths = require('./paths');

const IN_FILE = process.env.IN_FILE || paths.horsesPath('horses-all.json');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function parseDate(dateStr) {
  const dm = dateStr?.match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
  if (!dm) return null;
  const year = dm[3].length === 2 ? '20' + dm[3] : dm[3];
  return `${year}-${dm[2]}-${dm[1]}`;
}

async function processHorse(horse) {
  const scrapedAt = horse.scrapedAt || new Date().toISOString();

  // 1. 馬匹檔案
  if (horse.profile && Object.keys(horse.profile).length) {
    const p = horse.profile;
    const ageMatch = (p['Country of Origin / Age'] || '').match(/\/\s*(\d+)/);
    const colourSex = (p['Colour / Sex'] || '').split('/').map((s) => s.trim());
    const startsMatch = (p['No. of 1-2-3-Starts*'] || '').match(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/);

    const profileRow = {
      horse_code:    horse.code,
      horse_name:    horse.name || null,
      english_name:  p['Horse Name (English)'] || null,
      country_origin: (p['Country of Origin / Age'] || '').split('/')[0]?.trim() || null,
      age:           ageMatch ? Number(ageMatch[1]) : null,
      colour:        colourSex[0] || null,
      sex:           colourSex[1] || null,
      sire:          p['Sire'] || null,
      dam:           p['Dam'] || null,
      total_starts:  startsMatch ? Number(startsMatch[4]) : null,
      wins:          startsMatch ? Number(startsMatch[1]) : null,
      seconds:       startsMatch ? Number(startsMatch[2]) : null,
      thirds:        startsMatch ? Number(startsMatch[3]) : null,
      current_trainer: p['Trainer'] || null,
      current_owner: p['Owner'] || null,
      total_stakes:  p['Total Stakes*'] || null,
      raw_profile:   p,
      scraped_at:    scrapedAt,
    };

    await supabase.from('horse_profiles').upsert(profileRow, { onConflict: 'horse_code' });
  }

  // 2. 往績
  if (!horse.records?.length) return 0;

  const rows = horse.records
    .filter((r) => r.date && r.track)
    .map((r) => ({
      horse_code:  horse.code,
      horse_name:  horse.name || null,
      place:       r.place     || null,
      race_date:   parseDate(r.date),
      track:       r.track     || null,
      distance:    Number(r.distance) || null,
      going:       r.going     || null,
      class_no:    r.classNo   || null,
      draw:        r.draw      || null,
      rating:      r.rating    || null,
      trainer:     r.trainer   || null,
      jockey:      r.jockey    || null,
      lbw:         r.lbw       || null,
      odds:        r.odds      || null,
      act_wt:      r.actWt     || null,
      body_weight: r.bodyWeight || null,
      scraped_at:  scrapedAt,
    }))
    .filter((r) => r.race_date && r.distance);

  if (!rows.length) return 0;

  // 去重（同馬同日同距離只保留一筆）
  const seen = new Set();
  const uniqueRows = rows.filter((r) => {
    const key = `${r.horse_code}|${r.race_date}|${r.distance}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const { error } = await supabase
    .from('horse_records')
    .upsert(uniqueRows, { onConflict: 'horse_code,race_date,distance' });
  if (error) {
    console.error(`  Error [${horse.code}]:`, error.message);
    return 0;
  }
  return uniqueRows.length;
}

(async () => {
  if (!fs.existsSync(IN_FILE)) {
    console.error(`找不到 ${IN_FILE}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(IN_FILE, 'utf8'));
  const horses = data.horses || [];
  console.log(`共 ${horses.length} 匹馬待匯入`);

  let totalRecords = 0;
  let processed = 0;

  for (const horse of horses) {
    const n = await processHorse(horse);
    totalRecords += n;
    processed++;
    if (processed % 50 === 0 || processed === horses.length) {
      process.stdout.write(`\r[${processed}/${horses.length}] ${horse.code} | 總計 ${totalRecords} 筆往績     `);
    }
  }

  console.log(`\n完成！共匯入 ${totalRecords} 筆往績記錄`);
})();
