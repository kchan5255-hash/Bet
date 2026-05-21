// merge-analysis-by-date.js
// 將指定日期嘅 web/src/data/analysis-{date}.json 合併入 analysis-by-date.json
// （用作前端日曆顯示比賽日 + /races 頁讀取）
//
// 取代被歸檔嘅 build-multi-date-analysis.js 邏輯。
//
// 用法：
//   node merge-analysis-by-date.js 2026-05-24
//   node merge-analysis-by-date.js 2026-05-24 ST   ← 可選 venue (預設 ST)

const fs = require('fs');
const path = require('path');

const date = process.argv[2];
const venueArg = process.argv[3];

if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('用法: node merge-analysis-by-date.js <date> [venue]');
  process.exit(1);
}

const WEB_DATA_DIR = path.join(__dirname, 'web', 'src', 'data');
const SINGLE_FILE = path.join(WEB_DATA_DIR, `analysis-${date}.json`);
const INDEX_FILE = path.join(WEB_DATA_DIR, 'analysis-by-date.json');

if (!fs.existsSync(SINGLE_FILE)) {
  console.error(`找唔到 ${SINGLE_FILE}`);
  process.exit(1);
}

const races = JSON.parse(fs.readFileSync(SINGLE_FILE, 'utf8'));
if (!Array.isArray(races) || races.length === 0) {
  console.error(`${SINGLE_FILE} 內容非 array 或空`);
  process.exit(1);
}

const index = fs.existsSync(INDEX_FILE)
  ? JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'))
  : { dates: [], byDate: {} };

// 推算 venue / venueName / weekday
const venueCode = venueArg || 'ST';
const venueName = venueCode === 'HV' ? '跑馬地' : '沙田';
const weekday = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'][new Date(date + 'T00:00:00+08:00').getDay()];

const newEntry = {
  date,
  venue: venueCode,
  venueName,
  weekday,
  raceCount: races.length,
};

// 更新 dates list（同日去重，排序）
const otherDates = (index.dates || []).filter((d) => (d.date || d) !== date);
index.dates = [...otherDates, newEntry].sort((a, b) => (a.date || a).localeCompare(b.date || b));

// byDate 直接覆寫
index.byDate = index.byDate || {};
index.byDate[date] = races;

fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
console.log(`✓ ${date} ${venueCode} (${races.length} 場) 合併入 analysis-by-date.json (共 ${index.dates.length} 個比賽日)`);
